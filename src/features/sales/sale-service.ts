import "server-only";

import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import type { z } from "zod";

import { resolveCommissionRate } from "@/features/catalog/commission";
import { findGiftCardByCode, uniqueGiftCardCode } from "@/features/catalog/gift-cards";
import { validateDiscountCode } from "@/features/catalog/discounts";
import { toCommissionRule, toMembershipPlan, toPackage } from "@/features/catalog/mappers";
import { readProductsForSale, writeSaleStockMovements } from "@/features/inventory/service";
import { productDisplayName } from "@/features/inventory/types";
import { listServices } from "@/features/services/queries";
import { listStaff } from "@/features/staff/queries";
import { fail } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";
import { dateKeyOf } from "@/lib/dates";
import { percentOf, splitTax } from "@/lib/money";
import { defaultTaxRate, taxRateFor } from "@/lib/settings";
import { actorName, can, type AppContext } from "@/lib/tenancy/context";
import type { ClientPackageDTO, SaleItemType } from "@/lib/types";

import { priceSale, taxableAtSale, type MemberBenefits, type OrderDiscount } from "./pricing";
import type { saleInput } from "./schema";

type SaleInput = z.output<typeof saleInput>;

function monthsLater(from: number, period: "monthly" | "quarterly" | "yearly"): number {
  const d = new Date(from);
  const months = period === "monthly" ? 1 : period === "quarterly" ? 3 : 12;
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.getTime();
}

/**
 * Issues an invoice atomically: prices are re-derived from the catalogue,
 * permissions checked for overrides, and every side effect (stock, packages,
 * gift cards, memberships, client stats, appointment, counters, audit) is
 * written in one Firestore transaction.
 */
export async function executeSale(ctx: AppContext, input: SaleInput, branchId: string) {
  const orgId = ctx.org.id;
  const settings = ctx.settings;
  const inclusive = settings.tax.pricesIncludeTax;
  const now = Date.now();
  const nowTs = Timestamp.fromMillis(now);
  const today = dateKeyOf(now, ctx.timezone);
  const canDiscount = can(ctx, "apply_discounts");

  // Static data (outside the transaction: definitions, not balances).
  const [services, staff, ruleSnap, packageSnap, planSnap, membershipSnap] = await Promise.all([
    listServices(orgId),
    listStaff(orgId),
    orgCol(orgId, "commissionRules").where("active", "==", true).get(),
    orgCol(orgId, "packages").get(),
    orgCol(orgId, "membershipPlans").get(),
    input.clientId
      ? orgCol(orgId, "clientMemberships").where("clientId", "==", input.clientId).where("status", "==", "active").get()
      : Promise.resolve(null),
  ]);
  const serviceById = new Map(services.map((s) => [s.id, s]));
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const rules = ruleSnap.docs.map((d) => toCommissionRule(d.id, d.data()));
  const packages = new Map(packageSnap.docs.map((d) => [d.id, toPackage(d.id, d.data())]));
  const plans = new Map(planSnap.docs.map((d) => [d.id, toMembershipPlan(d.id, d.data())]));
  const activeMembership = membershipSnap?.docs
    .map((d) => d.data())
    .find((m) => ((m.endAt as Timestamp | null)?.toMillis() ?? Infinity) > now);
  const member: MemberBenefits | null = activeMembership
    ? { serviceDiscountBps: Number(activeMembership.serviceDiscountBps ?? 0), productDiscountBps: Number(activeMembership.productDiscountBps ?? 0) }
    : null;

  const methods = new Map(settings.payments.methods.filter((m) => m.enabled).map((m) => [m.id, m]));
  for (const p of input.payments) if (!methods.has(p.methodId)) fail("errors.validation", { payments: "validation.invalid" });
  if (input.lines.some((l) => (l.type === "package" || l.type === "membership") && !input.clientId)) {
    fail("errors.validation", { clientId: "pos.requiresClient" });
  }

  const txRef = orgCol(orgId, "transactions").doc();
  const cashier = actorName(ctx);

  return db().runTransaction(async (tx) => {
    // ── Reads ───────────────────────────────────────────────────────────
    const apptRef = input.appointmentId ? orgCol(orgId, "appointments").doc(input.appointmentId) : null;
    const clientRef = input.clientId ? orgCol(orgId, "clients").doc(input.clientId) : null;
    const counterRef = orgCol(orgId, "counters").doc("invoice");
    const redeemIds = [...new Set(input.lines.map((l) => l.redeemClientPackageId).filter((x): x is string => !!x))];
    const creditIds = [...new Set(input.payments.map((p) => p.clientPackageId).filter((x): x is string => !!x))];
    const packageRefs = [...new Set([...redeemIds, ...creditIds])].map((id) => orgCol(orgId, "clientPackages").doc(id));

    const appointment = apptRef ? await tx.get(apptRef) : null;
    const client: DocumentSnapshot | null = clientRef ? await tx.get(clientRef) : null;
    const counterSnap = await tx.get(counterRef);
    const packageSnaps = packageRefs.length ? await tx.getAll(...packageRefs) : [];
    if (appointment) {
      if (!appointment.exists) fail("errors.notFound");
      if (appointment.get("transactionId")) fail("errors.alreadyPaid");
      if (appointment.get("branchId") !== branchId) fail("errors.branchForbidden");
    }
    if (client && !client.exists) fail("errors.validation", { clientId: "errors.notFound" });
    const clientPackages = new Map(packageSnaps.filter((s) => s.exists).map((s) => [s.id, { ref: s.ref, data: s.data() ?? {} }]));

    const products = await readProductsForSale(tx, orgId, input.lines.filter((l) => l.type === "product").map((l) => l.refId));

    let discountDoc: Awaited<ReturnType<typeof validateDiscountCode>> = null;
    if (input.orderDiscount.kind === "code") {
      discountDoc = await validateDiscountCode(orgId, input.orderDiscount.code, today, tx);
      if (!discountDoc) fail("errors.invalidDiscount");
    }

    const giftCardSnaps = new Map<string, DocumentSnapshot>();
    for (const p of input.payments) {
      const method = methods.get(p.methodId)!;
      if (method.type !== "gift_card" || giftCardSnaps.has(p.giftCardCode)) continue;
      const found = await findGiftCardByCode(orgId, p.giftCardCode, tx);
      if (!found) fail("errors.giftCardInvalid");
      giftCardSnaps.set(p.giftCardCode, await tx.get(orgCol(orgId, "giftCards").doc(found.id)));
    }

    const newCardCodes: { code: string; codeNormalized: string }[] = [];
    for (const l of input.lines) {
      if (l.type !== "gift_card") continue;
      for (let i = 0; i < l.quantity; i++) newCardCodes.push(await uniqueGiftCardCode(orgId, tx));
    }

    // ── Build lines with authoritative names, prices and tax ──────────
    const defaultRate = defaultTaxRate(settings)?.rateBps ?? 0;
    const redemptionUse = new Map<string, number>(); // clientPackageId:serviceId → sessions
    const built = input.lines.map((l, index) => {
      let name = "";
      let catalogPrice: number | null = null;
      let taxRateBps = 0;
      let packageKind: "services" | "credit" | undefined;
      if (l.type === "service") {
        const s = serviceById.get(l.refId);
        if (!s) fail("errors.validation", { [`lines.${index}`]: "errors.notFound" });
        name = s.name;
        catalogPrice = s.priceMinor;
        taxRateBps = taxRateFor(settings, s);
      } else if (l.type === "product") {
        const p = products.get(l.refId);
        if (!p || !p.active || p.usage === "professional") fail("errors.validation", { [`lines.${index}`]: "errors.notFound" });
        name = productDisplayName(p.brand, p.name);
        catalogPrice = p.priceMinor;
        taxRateBps = taxRateFor(settings, p);
      } else if (l.type === "package") {
        const pk = packages.get(l.refId);
        if (!pk || !pk.active) fail("errors.validation", { [`lines.${index}`]: "errors.notFound" });
        name = pk.name;
        catalogPrice = pk.priceMinor;
        packageKind = pk.kind;
        taxRateBps = taxableAtSale("package", pk.kind) ? defaultRate : 0;
      } else if (l.type === "membership") {
        const plan = plans.get(l.refId);
        if (!plan || !plan.active) fail("errors.validation", { [`lines.${index}`]: "errors.notFound" });
        name = plan.name;
        catalogPrice = plan.priceMinor;
        taxRateBps = defaultRate;
      } else {
        name = "Gift card";
        if (l.unitPriceMinor < 100) fail("errors.validation", { [`lines.${index}`]: "validation.positive" });
        taxRateBps = 0;
      }

      let unitPrice = l.unitPriceMinor;
      let discount = l.discountMinor;
      let redeemed: string | null = null;
      if (l.redeemClientPackageId) {
        const cp = clientPackages.get(l.redeemClientPackageId);
        const items = (cp?.data.items ?? []) as ClientPackageDTO["items"];
        const expires = (cp?.data.expiresAt as Timestamp | null)?.toMillis() ?? Infinity;
        const entry = items.find((i) => i.serviceId === l.refId);
        const key = `${l.redeemClientPackageId}:${l.refId}`;
        const already = redemptionUse.get(key) ?? 0;
        if (
          l.type !== "service" ||
          !cp ||
          cp.data.clientId !== input.clientId ||
          cp.data.status !== "active" ||
          expires < now ||
          !entry ||
          entry.total - entry.used - already < l.quantity
        ) {
          fail("errors.packageInvalid");
        }
        redemptionUse.set(key, already + l.quantity);
        unitPrice = 0;
        discount = 0;
        redeemed = l.redeemClientPackageId;
      } else if (catalogPrice !== null && unitPrice !== catalogPrice && !canDiscount) {
        fail("errors.forbidden");
      }
      if (discount > 0 && !canDiscount) fail("errors.forbidden");

      const person = l.staffId ? staffById.get(l.staffId) : undefined;
      if (l.staffId && !person) fail("errors.validation", { [`lines.${index}`]: "errors.notFound" });
      return { input: l, name, unitPrice, discount, taxRateBps, redeemed, packageKind, person, catalogPrice };
    });

    let orderDiscount: OrderDiscount = { kind: "none", valueBps: 0, valueMinor: 0, appliesTo: "all" };
    if (input.orderDiscount.kind === "percent" || input.orderDiscount.kind === "fixed") {
      if (!canDiscount) fail("errors.forbidden");
      orderDiscount = { kind: input.orderDiscount.kind, valueBps: input.orderDiscount.valueBps, valueMinor: input.orderDiscount.valueMinor, appliesTo: "all" };
    } else if (discountDoc) {
      orderDiscount = { kind: discountDoc.kind, valueBps: discountDoc.valueBps, valueMinor: discountDoc.valueMinor, appliesTo: discountDoc.appliesTo };
    }

    const pricing = priceSale(
      built.map((b) => ({ type: b.input.type as SaleItemType, quantity: b.input.quantity, unitPriceMinor: b.unitPrice, discountMinor: b.discount, taxRateBps: b.taxRateBps })),
      { orderDiscount, member: member, pricesIncludeTax: inclusive, tipMinor: input.tip.amountMinor },
    );
    if (input.tip.amountMinor > 0 && input.tip.staffId && !staffById.has(input.tip.staffId)) fail("errors.validation", { tip: "errors.notFound" });

    // ── Payments ──────────────────────────────────────────────────────
    const paid = input.payments.reduce((s, p) => s + p.amountMinor, 0);
    if (paid > pricing.dueMinor) fail("errors.paymentExceeds");
    if (paid < pricing.dueMinor && !(input.allowBalance && settings.payments.allowClientDebt && input.clientId)) fail("errors.balanceDue");

    const giftCardDebits = new Map<string, number>();
    for (const p of input.payments) {
      const method = methods.get(p.methodId)!;
      if (method.type === "gift_card") {
        const card = giftCardSnaps.get(p.giftCardCode)!;
        const expires = (card.get("expiresAt") as Timestamp | null)?.toMillis() ?? Infinity;
        const used = (giftCardDebits.get(card.id) ?? 0) + p.amountMinor;
        if (card.get("status") !== "active" || expires < now) fail("errors.giftCardInvalid");
        if (Number(card.get("balanceMinor") ?? 0) < used) fail("errors.giftCardBalance");
        giftCardDebits.set(card.id, used);
      }
      if (method.type === "package") {
        const cp = p.clientPackageId ? clientPackages.get(p.clientPackageId) : undefined;
        const expires = (cp?.data.expiresAt as Timestamp | null)?.toMillis() ?? Infinity;
        const remaining = Number(cp?.data.creditMinor ?? 0) - Number(cp?.data.creditUsedMinor ?? 0);
        if (!cp || cp.data.clientId !== input.clientId || cp.data.kind !== "credit" || cp.data.status !== "active" || expires < now || remaining < p.amountMinor) {
          fail("errors.packageInvalid");
        }
      }
    }

    // ── Assemble the invoice ──────────────────────────────────────────
    const counter = Number(counterSnap?.get("value") ?? 0) + 1;
    const number = `${settings.receipts.invoicePrefix}${String(counter).padStart(6, "0")}`;
    let cardIndex = 0;
    const createdCards: { ref: FirebaseFirestore.DocumentReference; code: string; codeNormalized: string; amount: number; line: (typeof built)[number] }[] = [];

    const items = built.map((b, i) => {
      const priced = pricing.lines[i]!;
      let commissionMinor = 0;
      let commissionRuleId: string | null = null;
      if ((b.input.type === "service" || b.input.type === "product") && b.person) {
        const rate = resolveCommissionRate({
          itemType: b.input.type,
          staffId: b.person.id,
          serviceId: b.input.type === "service" ? b.input.refId : null,
          rules,
          staffDefaults: b.person.commission,
        });
        const base = b.redeemed
          ? splitTax((b.catalogPrice ?? 0) * b.input.quantity, b.taxRateBps, inclusive).netMinor
          : priced.netMinor;
        commissionMinor = percentOf(base, rate.rateBps);
        commissionRuleId = rate.ruleId;
      }
      const giftCardIds: string[] = [];
      if (b.input.type === "gift_card") {
        for (let q = 0; q < b.input.quantity; q++) {
          const codes = newCardCodes[cardIndex++]!;
          const ref = orgCol(orgId, "giftCards").doc();
          giftCardIds.push(ref.id);
          createdCards.push({ ref, ...codes, amount: b.unitPrice, line: b });
        }
      }
      return {
        id: `it_${i}_${b.input.key}`.slice(0, 60),
        type: b.input.type,
        refId: b.input.refId,
        name: b.name,
        staffId: b.person?.id ?? null,
        staffName: b.person?.displayName ?? "",
        quantity: b.input.quantity,
        unitPriceMinor: b.unitPrice,
        discountMinor: priced.discountMinor,
        memberDiscountMinor: priced.memberDiscountMinor,
        taxRateBps: b.taxRateBps,
        taxMinor: priced.taxMinor,
        netMinor: priced.netMinor,
        totalMinor: priced.totalMinor,
        commissionMinor,
        commissionRuleId,
        redeemedClientPackageId: b.redeemed,
        appointmentLineId: b.input.appointmentLineId,
        giftCardIds,
      };
    });

    const payments = input.payments.map((p, i) => {
      const method = methods.get(p.methodId)!;
      const card = method.type === "gift_card" ? giftCardSnaps.get(p.giftCardCode) : undefined;
      return {
        id: `p${i + 1}`,
        methodId: method.id,
        methodType: method.type,
        label: method.label,
        amountMinor: p.amountMinor,
        reference: card ? String(card.get("code")) : p.reference,
        giftCardId: card?.id ?? null,
        clientPackageId: method.type === "package" ? p.clientPackageId : null,
        at: nowTs,
        byUid: ctx.session.uid,
      };
    });
    const balance = pricing.dueMinor - paid;
    const status = balance === 0 ? "paid" : paid > 0 ? "partially_paid" : "unpaid";
    const staffIds = [...new Set([...items.map((i) => i.staffId), input.tip.amountMinor > 0 ? input.tip.staffId : null].filter((x): x is string => !!x))];
    const clientName = client ? String(client.get("fullName") ?? "") : appointment ? String(appointment.get("clientName") ?? "") : "";

    // ── Writes ────────────────────────────────────────────────────────
    const productLines = built
      .filter((b) => b.input.type === "product")
      .map((b) => ({ product: products.get(b.input.refId)!, quantity: b.input.quantity }))
      .filter((l) => l.product.trackStock);
    if (productLines.length) writeSaleStockMovements(tx, ctx, { branchId, transactionId: txRef.id, lines: productLines, kind: "sale" });

    tx.set(txRef, {
      number,
      branchId,
      dateKey: today,
      status,
      clientId: input.clientId,
      clientName,
      appointmentId: input.appointmentId,
      items,
      subtotalMinor: pricing.subtotalMinor,
      discountMinor: pricing.discountMinor,
      memberDiscountMinor: pricing.memberDiscountMinor,
      orderDiscountMinor: pricing.orderDiscountMinor,
      taxMinor: pricing.taxMinor,
      totalMinor: pricing.totalMinor,
      tipMinor: pricing.tipMinor,
      tipStaffId: input.tip.amountMinor > 0 ? input.tip.staffId : null,
      paidMinor: paid,
      balanceMinor: balance,
      refundedMinor: 0,
      payments,
      paymentMethods: [...new Set(payments.map((p) => p.methodId))],
      refunds: [],
      staffIds,
      discountId: discountDoc?.id ?? null,
      discountCode: discountDoc?.code ?? "",
      notes: input.notes,
      cashierUid: ctx.session.uid,
      cashierName: cashier,
      createdAt: nowTs,
      updatedAt: nowTs,
    });
    tx.set(counterRef, { value: counter }, { merge: true });

    if (appointment && apptRef) {
      tx.update(apptRef, { status: "completed", completedAt: nowTs, transactionId: txRef.id, updatedAt: nowTs });
    }
    if (client && clientRef) {
      const hasService = items.some((i) => i.type === "service");
      tx.update(clientRef, {
        "stats.totalSpendMinor": FieldValue.increment(pricing.totalMinor),
        ...(hasService ? { "stats.visits": FieldValue.increment(1), "stats.lastVisitAt": nowTs } : {}),
        ...(hasService && !client.get("stats.firstVisitAt") ? { "stats.firstVisitAt": nowTs } : {}),
        updatedAt: nowTs,
      });
    }

    for (const [key, used] of redemptionUse) {
      const [cpId, serviceId] = key.split(":") as [string, string];
      const cp = clientPackages.get(cpId)!;
      const itemsNext = ((cp.data.items ?? []) as ClientPackageDTO["items"]).map((i) => (i.serviceId === serviceId ? { ...i, used: i.used + used } : i));
      const exhausted = itemsNext.every((i) => i.used >= i.total);
      cp.data.items = itemsNext;
      tx.update(cp.ref, {
        items: itemsNext,
        status: exhausted ? "exhausted" : "active",
        redemptions: FieldValue.arrayUnion({ at: nowTs, serviceId, quantity: used, amountMinor: 0, transactionId: txRef.id, label: serviceById.get(serviceId)?.name ?? "" }),
      });
    }
    for (const p of payments) {
      if (p.methodType === "package" && p.clientPackageId) {
        const cp = clientPackages.get(p.clientPackageId)!;
        const usedNext = Number(cp.data.creditUsedMinor ?? 0) + p.amountMinor;
        cp.data.creditUsedMinor = usedNext;
        tx.update(cp.ref, {
          creditUsedMinor: usedNext,
          status: usedNext >= Number(cp.data.creditMinor ?? 0) ? "exhausted" : "active",
          redemptions: FieldValue.arrayUnion({ at: nowTs, serviceId: "", quantity: 1, amountMinor: p.amountMinor, transactionId: txRef.id, label: number }),
        });
      }
    }
    for (const [cardId, amount] of giftCardDebits) {
      const card = [...giftCardSnaps.values()].find((c) => c.id === cardId)!;
      const next = Number(card.get("balanceMinor") ?? 0) - amount;
      tx.update(card.ref, {
        balanceMinor: next,
        status: next <= 0 ? "redeemed" : "active",
        redemptions: FieldValue.arrayUnion({ at: nowTs, amountMinor: amount, transactionId: txRef.id }),
      });
    }

    const clientFullName = clientName || "";
    for (const b of built) {
      if (b.input.type === "package") {
        const pk = packages.get(b.input.refId)!;
        for (let q = 0; q < b.input.quantity; q++) {
          tx.set(orgCol(orgId, "clientPackages").doc(), {
            clientId: input.clientId,
            clientName: clientFullName,
            packageId: pk.id,
            name: pk.name,
            kind: pk.kind,
            purchasedAt: nowTs,
            expiresAt: pk.validityDays > 0 ? Timestamp.fromMillis(now + pk.validityDays * 86_400_000) : null,
            transactionId: txRef.id,
            items: pk.items.map((i) => ({ serviceId: i.serviceId, serviceName: i.serviceName, total: i.quantity, used: 0 })),
            creditMinor: pk.creditMinor,
            creditUsedMinor: 0,
            status: "active",
            redemptions: [],
            createdAt: nowTs,
          });
        }
      }
      if (b.input.type === "membership") {
        const plan = plans.get(b.input.refId)!;
        tx.set(orgCol(orgId, "clientMemberships").doc(), {
          clientId: input.clientId,
          clientName: clientFullName,
          planId: plan.id,
          planName: plan.name,
          startAt: nowTs,
          endAt: Timestamp.fromMillis(monthsLater(now, plan.period)),
          status: "active",
          autoRenew: true,
          transactionId: txRef.id,
          serviceDiscountBps: plan.serviceDiscountBps,
          productDiscountBps: plan.productDiscountBps,
          includedServices: plan.includedServices,
          createdAt: nowTs,
        });
      }
    }
    for (const c of createdCards) {
      tx.set(c.ref, {
        code: c.code,
        codeNormalized: c.codeNormalized,
        initialMinor: c.amount,
        balanceMinor: c.amount,
        issuedAt: nowTs,
        expiresAt: Timestamp.fromMillis(now + 365 * 86_400_000),
        purchaserClientId: input.clientId,
        purchaserName: clientFullName,
        recipientName: c.line.input.giftCard?.recipientName ?? "",
        recipientEmail: c.line.input.giftCard?.recipientEmail ?? "",
        message: c.line.input.giftCard?.message ?? "",
        status: "active",
        transactionId: txRef.id,
        redemptions: [],
        createdAt: nowTs,
      });
    }
    if (discountDoc) tx.update(orgCol(orgId, "discounts").doc(discountDoc.id), { usedCount: FieldValue.increment(1) });

    audit(
      ctx,
      {
        action: "transaction.created",
        entity: "transaction",
        entityId: txRef.id,
        branchId,
        summary: `${number} · ${clientName || "Walk-in"} · ${(pricing.dueMinor / 100).toFixed(2)} ${ctx.currency}`,
      },
      tx,
    );
    return { id: txRef.id, number, dueMinor: pricing.dueMinor, clientId: input.clientId };
  });
}
