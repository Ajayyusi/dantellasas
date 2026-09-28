import "server-only";

import { FieldValue, Timestamp, type BulkWriter, type DocumentReference } from "firebase-admin/firestore";

import { db, orgCol, orgRef } from "@/lib/db";
import { addDaysToKey, dateKeyOf, minutesToTime, timeToMinutes, todayKey, weekdayOfKey, zonedInstant } from "@/lib/dates";
import { computeTicket, percentOf, splitTax } from "@/lib/money";
import { buildSearchTokens, normalizePhone } from "@/lib/search";
import { resolveSettings } from "@/lib/settings";

import {
  AREAS,
  DEMO_CATEGORIES,
  DEMO_CLIENTS,
  DEMO_PRODUCT_CATEGORIES,
  DEMO_PRODUCTS,
  DEMO_SERVICES,
  DEMO_STAFF,
  DEMO_SUPPLIERS,
  MOBILE_PREFIXES,
  SOURCES,
} from "./demo-data";

export interface SeedDemoInput {
  orgId: string;
  branchId: string;
  actorUid: string;
  actorName: string;
  /** Days of history to generate (default 45) and days ahead (default 14). */
  pastDays?: number;
  futureDays?: number;
}

export interface SeedDemoResult {
  appointments: number;
  transactions: number;
  staffIds: Record<string, string>;
  secondBranchId: string;
}

/** Deterministic PRNG so demo data looks the same on every run. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const M = (aed: number) => Math.round(aed * 100);

/**
 * Fills an organization with a coherent salon: catalogue, staff, clients,
 * products, 45 days of appointments with matching invoices (VAT and
 * commission computed exactly like checkout), upcoming bookings, expenses,
 * packages, memberships, gift cards and attendance. Every document carries
 * `demo: true`.
 */
export async function seedDemoData(input: SeedDemoInput): Promise<SeedDemoResult> {
  const { orgId, branchId } = input;
  const pastDays = input.pastDays ?? 45;
  const futureDays = input.futureDays ?? 14;
  const rand = rng(20260928);
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!;
  const chance = (p: number) => rand() < p;

  const orgSnap = await orgRef(orgId).get();
  const settings = resolveSettings(orgSnap.get("settings"));
  const tz = settings.locale.timezone;
  const inclusive = settings.tax.pricesIncludeTax;
  const vatBps = settings.tax.enabled ? (settings.tax.rates.find((r) => r.isDefault)?.rateBps ?? 500) : 0;
  const today = todayKey(tz);
  const now = Date.now();
  const writer: BulkWriter = db().bulkWriter();
  writer.onWriteError((err) => err.failedAttempts < 3);
  const created = FieldValue.serverTimestamp();
  const set = (ref: DocumentReference, data: Record<string, unknown>) => void writer.set(ref, { ...data, demo: true });

  // ── Second branch ────────────────────────────────────────────────────
  const hours = (start: string, end: string) =>
    Object.fromEntries(["0", "1", "2", "3", "4", "5", "6"].map((d) => [d, { open: true, start, end }]));
  void writer.set(
    orgCol(orgId, "branches").doc(branchId),
    { workingHours: hours("10:00", "22:00"), address: "Jumeirah Beach Road, Villa 212, Dubai" },
    { merge: true },
  );
  const barsha = orgCol(orgId, "branches").doc();
  set(barsha, {
    name: "Al Barsha",
    code: "BAR",
    phone: "+971 4 399 8710",
    email: "",
    address: "Al Barsha 1, Street 23, Dubai",
    timezone: tz,
    active: true,
    sortOrder: 1,
    workingHours: hours("11:00", "22:00"),
    createdAt: created,
    updatedAt: created,
  });
  const branchOf = (staffKey: string) => (staffKey === "joy" || staffKey === "hana" ? barsha.id : branchId);

  // ── Catalogue ─────────────────────────────────────────────────────────
  const categoryIds = new Map<string, string>();
  DEMO_CATEGORIES.forEach((c, i) => {
    const ref = orgCol(orgId, "serviceCategories").doc();
    categoryIds.set(c.key, ref.id);
    set(ref, { name: c.name, nameAr: c.nameAr, color: c.color, sortOrder: i, active: true, createdAt: created, updatedAt: created });
  });

  const staffIds = new Map<string, string>();
  DEMO_STAFF.forEach((s) => staffIds.set(s.key, orgCol(orgId, "staff").doc().id));

  const services = DEMO_SERVICES.map((s, i) => {
    const ref = orgCol(orgId, "services").doc();
    const performers = DEMO_STAFF.filter((st) => st.categories.includes(s.category)).map((st) => staffIds.get(st.key)!);
    set(ref, {
      categoryId: categoryIds.get(s.category),
      name: s.name,
      nameAr: s.nameAr,
      description: "",
      durationMin: s.duration,
      bufferMin: 0,
      priceMinor: M(s.price),
      taxRateId: null,
      taxExempt: false,
      branchIds: [],
      staffIds: performers,
      onlineBookable: true,
      active: true,
      sortOrder: i,
      createdAt: created,
      updatedAt: created,
    });
    return { ...s, id: ref.id, priceMinor: M(s.price) };
  });

  DEMO_STAFF.forEach((s, i) => {
    const [start, end] = s.shift;
    const breakStart = minutesToTime(timeToMinutes(start) + 4 * 60);
    const schedule = Object.fromEntries(
      ["0", "1", "2", "3", "4", "5", "6"].map((d) => [
        d,
        { working: Number(d) !== s.dayOff, start, end, breakStart, breakEnd: minutesToTime(timeToMinutes(breakStart) + 60) },
      ]),
    );
    set(orgCol(orgId, "staff").doc(staffIds.get(s.key)!), {
      firstName: s.firstName,
      lastName: s.lastName,
      displayName: `${s.firstName} ${s.lastName}`,
      photoUrl: null,
      phone: `+971 5${Math.floor(rand() * 9)} ${100 + Math.floor(rand() * 899)} ${1000 + Math.floor(rand() * 8999)}`,
      email: `${s.firstName.toLowerCase()}@dantella.app`,
      position: s.position,
      branchIds: [branchOf(s.key)],
      status: "active",
      color: s.color,
      hireDate: s.hireDate,
      bookable: true,
      schedule,
      commission: { serviceRateBps: 1000, productRateBps: 500 },
      hr: {
        dateOfBirth: `${1985 + i * 2}-0${(i % 9) + 1}-1${i % 9}`,
        nationality: s.nationality,
        passportExpiry: i === 2 ? addDaysToKey(today, 21) : `20${29 + (i % 4)}-0${(i % 9) + 1}-15`,
        visaExpiry: i === 4 ? addDaysToKey(today, 12) : `2027-${String((i % 12) + 1).padStart(2, "0")}-01`,
      },
      memberUid: null,
      sortOrder: i,
      createdAt: created,
      updatedAt: created,
    });
  });

  // ── Clients ───────────────────────────────────────────────────────────
  interface DemoClient {
    id: string;
    fullName: string;
    phone: string;
    visits: number;
    spend: number;
    first: number | null;
    last: number | null;
    next: number | null;
    noShows: number;
    cancellations: number;
    data: Record<string, unknown>;
  }
  const clients: DemoClient[] = DEMO_CLIENTS.map((c, i) => {
    const ref = orgCol(orgId, "clients").doc();
    const phone = `${pick(MOBILE_PREFIXES)} ${100 + Math.floor(rand() * 899)} ${1000 + Math.floor(rand() * 8999)}`;
    const email = `${c.first.toLowerCase()}.${c.last.toLowerCase().replace(/[^a-z]/g, "")}@${pick(["gmail.com", "outlook.com", "icloud.com", "yahoo.com"])}`;
    const phoneNormalized = normalizePhone(phone, settings.locale.phoneCountryCode);
    const tags = i < 6 ? ["VIP"] : i % 7 === 0 ? ["Sensitive skin"] : i % 5 === 0 ? ["Prefers mornings"] : [];
    return {
      id: ref.id,
      fullName: `${c.first} ${c.last}`,
      phone,
      visits: 0,
      spend: 0,
      first: null,
      last: null,
      next: null,
      noShows: 0,
      cancellations: 0,
      data: {
        firstName: c.first,
        lastName: c.last,
        fullName: `${c.first} ${c.last}`,
        phone,
        phoneNormalized,
        email,
        emailLower: email,
        birthday: { month: (i % 12) + 1, day: ((i * 7) % 27) + 1, year: 1978 + (i % 25) },
        gender: c.gender,
        nationality: c.nationality,
        source: pick(SOURCES),
        tags,
        notes: i === 0 ? "Prefers Sara for cuts. Allergic to ammonia-based colour." : i === 3 ? "Likes a quiet room and herbal tea." : "",
        preferredStaffId: i % 4 === 0 ? staffIds.get("sara") : null,
        marketingConsent: i % 3 !== 0,
        status: "active",
        area: pick(AREAS),
        searchTokens: buildSearchTokens({ names: [c.first, c.last], phone: phoneNormalized, email }),
      },
    };
  });

  // ── Products & suppliers ──────────────────────────────────────────────
  const productCategoryIds = new Map<string, string>();
  DEMO_PRODUCT_CATEGORIES.forEach((c, i) => {
    const ref = orgCol(orgId, "productCategories").doc();
    productCategoryIds.set(c.key, ref.id);
    set(ref, { name: c.name, nameAr: c.nameAr, sortOrder: i, active: true, createdAt: created });
  });
  const supplierIds = new Map<string, string>();
  DEMO_SUPPLIERS.forEach((s) => {
    const ref = orgCol(orgId, "suppliers").doc();
    supplierIds.set(s.key, ref.id);
    set(ref, { name: s.name, contactName: s.contactName, phone: s.phone, email: s.email, trn: s.trn, notes: "", active: true, createdAt: created });
  });
  const products = DEMO_PRODUCTS.map((p) => ({ ...p, id: orgCol(orgId, "products").doc().id, sold: 0 }));
  const retail = products.filter((p) => p.usage === "retail");

  // ── Appointments & invoices ───────────────────────────────────────────
  const staffList = DEMO_STAFF.map((s) => ({ ...s, id: staffIds.get(s.key)!, name: `${s.firstName} ${s.lastName}` }));
  const payMethods = settings.payments.methods;
  const cash = payMethods.find((m) => m.type === "cash") ?? payMethods[0]!;
  const card = payMethods.find((m) => m.type === "card") ?? payMethods[0]!;
  interface PendingTx {
    at: number;
    data: Record<string, unknown>;
    ref: DocumentReference;
  }
  const pendingTx: PendingTx[] = [];
  let appointmentCount = 0;

  for (let offset = -pastDays; offset <= futureDays; offset++) {
    const dayKey = addDaysToKey(today, offset);
    const weekday = weekdayOfKey(dayKey);
    for (const st of staffList) {
      if (weekday === st.dayOff) continue;
      const stServices = services.filter((s) => (st.categories as readonly string[]).includes(s.category));
      const weighted = stServices.flatMap((s) => Array.from({ length: s.popularity }, () => s));
      const shiftStart = timeToMinutes(st.shift[0]);
      const shiftEnd = timeToMinutes(st.shift[1]);
      const breakStart = shiftStart + 240;
      let cursor = shiftStart + Math.floor(rand() * 3) * 30;
      const target = offset > 0 ? 1 + Math.floor(rand() * 3) : 3 + Math.floor(rand() * 3);
      let made = 0;
      while (made < target && cursor < shiftEnd - 30) {
        if (cursor >= breakStart && cursor < breakStart + 60) {
          cursor = breakStart + 60;
          continue;
        }
        const first = pick(weighted);
        const lines = [first];
        if (chance(0.22)) {
          const options = stServices.filter((s) => s.id !== first.id && s.duration <= 60);
          if (options.length) lines.push(pick(options));
        }
        const total = lines.reduce((s, l) => s + l.duration, 0);
        if (cursor + total > shiftEnd || (cursor < breakStart && cursor + total > breakStart)) {
          cursor = cursor < breakStart ? breakStart + 60 : shiftEnd;
          continue;
        }

        const walkIn = chance(0.08);
        const client = walkIn ? null : pick(clients);
        const startMs = zonedInstant(dayKey, minutesToTime(cursor), tz).getTime();
        const endMs = startMs + total * 60_000;
        let status: string;
        if (offset < 0) status = chance(0.06) ? "no_show" : chance(0.06) ? "cancelled" : "completed";
        else if (offset > 0) status = chance(0.6) ? "confirmed" : "booked";
        else if (endMs <= now) status = chance(0.05) ? "no_show" : "completed";
        else if (startMs <= now) status = chance(0.5) ? "in_service" : "checked_in";
        else status = chance(0.5) ? "confirmed" : "booked";

        let lineStart = startMs;
        const items = lines.map((l, i) => {
          const discount = chance(0.08) ? percentOf(l.priceMinor, 1000) : 0;
          const item = {
            id: `ln_${appointmentCount}_${i}`,
            serviceId: l.id,
            serviceName: l.name,
            staffId: st.id,
            staffName: st.name,
            startAt: Timestamp.fromMillis(lineStart),
            durationMin: l.duration,
            priceMinor: l.priceMinor,
            discountMinor: discount,
          };
          lineStart += l.duration * 60_000;
          return item;
        });
        const apptRef = orgCol(orgId, "appointments").doc();
        const totalMinor = items.reduce((s, i) => s + i.priceMinor - i.discountMinor, 0);
        const apptData: Record<string, unknown> = {
          branchId: branchOf(st.key),
          dateKey: dayKey,
          startAt: Timestamp.fromMillis(startMs),
          endAt: Timestamp.fromMillis(endMs),
          status,
          source: walkIn ? "walk_in" : pick(["phone", "phone", "in_person", "online"]),
          clientId: client?.id ?? null,
          clientName: client?.fullName ?? "Walk-in",
          clientPhone: client?.phone ?? "",
          items,
          staffIds: [st.id],
          serviceIds: [...new Set(items.map((i) => i.serviceId))],
          totalMinor,
          notes: chance(0.1) ? pick(["Prefers low heat", "First visit — referred by a friend", "Bring reference photo", "Running 10 min late"]) : "",
          cancellation:
            status === "cancelled"
              ? { reason: pick(settings.appointments.cancellationReasons), note: "", at: Timestamp.fromMillis(startMs - 86_400_000), byUid: input.actorUid }
              : null,
          transactionId: null,
          createdByUid: input.actorUid,
          createdAt: Timestamp.fromMillis(startMs - (2 + Math.floor(rand() * 10)) * 86_400_000),
          updatedAt: created,
        };
        if (status === "completed") {
          apptData.checkedInAt = Timestamp.fromMillis(startMs - 5 * 60_000);
          apptData.completedAt = Timestamp.fromMillis(endMs);
        }

        if (client) {
          if (status === "no_show") client.noShows++;
          if (status === "cancelled") client.cancellations++;
          if ((status === "booked" || status === "confirmed") && startMs > now) client.next = client.next ? Math.min(client.next, startMs) : startMs;
        }

        if (status === "completed") {
          const txRef = orgCol(orgId, "transactions").doc();
          apptData.transactionId = txRef.id;
          const saleLines: {
            type: "service" | "product";
            refId: string;
            name: string;
            quantity: number;
            unitPriceMinor: number;
            discountMinor: number;
            taxRateBps: number;
            rate: number;
          }[] = items.map((i) => ({
            type: "service",
            refId: i.serviceId,
            name: i.serviceName,
            quantity: 1,
            unitPriceMinor: i.priceMinor,
            discountMinor: i.discountMinor,
            taxRateBps: vatBps,
            rate: 1000,
          }));
          if (chance(0.15) && retail.length) {
            const p = pick(retail);
            p.sold++;
            saleLines.push({ type: "product", refId: p.id, name: `${p.brand} ${p.name}`, quantity: 1, unitPriceMinor: M(p.price), discountMinor: 0, taxRateBps: vatBps, rate: 500 });
          }
          const ticket = computeTicket(saleLines, 0, inclusive);
          const txItems = saleLines.map((l, i) => {
            const r = ticket.lines[i]!;
            return {
              id: `it_${i}`,
              type: l.type,
              refId: l.refId,
              name: l.name,
              staffId: st.id,
              staffName: st.name,
              quantity: l.quantity,
              unitPriceMinor: l.unitPriceMinor,
              discountMinor: r.discountMinor,
              taxRateBps: l.taxRateBps,
              taxMinor: r.taxMinor,
              totalMinor: r.totalMinor,
              commissionMinor: percentOf(r.netMinor, l.rate),
              commissionRuleId: null,
            };
          });
          const tip = chance(0.12) ? M(pick([20, 25, 30, 50])) : 0;
          const due = ticket.totalMinor + tip;
          const at = Timestamp.fromMillis(endMs + 3 * 60_000);
          const split = chance(0.1);
          const method = chance(0.6) ? card : cash;
          const half = Math.round(due / 2 / 100) * 100;
          const payments = split
            ? [
                { id: "p1", methodId: cash.id, methodType: cash.type, label: cash.label, amountMinor: half, reference: "", at, byUid: input.actorUid },
                { id: "p2", methodId: card.id, methodType: card.type, label: card.label, amountMinor: due - half, reference: "", at, byUid: input.actorUid },
              ]
            : [
                {
                  id: "p1",
                  methodId: method.id,
                  methodType: method.type,
                  label: method.label,
                  amountMinor: due,
                  reference: method.type === "card" ? `**** ${1000 + Math.floor(rand() * 8999)}` : "",
                  at,
                  byUid: input.actorUid,
                },
              ];
          pendingTx.push({
            at: endMs,
            ref: txRef,
            data: {
              branchId: branchOf(st.key),
              dateKey: dateKeyOf(endMs, tz),
              status: "paid",
              clientId: client?.id ?? null,
              clientName: client?.fullName ?? "Walk-in",
              appointmentId: apptRef.id,
              items: txItems,
              subtotalMinor: ticket.subtotalMinor,
              discountMinor: ticket.discountMinor,
              taxMinor: ticket.taxMinor,
              totalMinor: ticket.totalMinor,
              tipMinor: tip,
              tipStaffId: tip ? st.id : null,
              paidMinor: due,
              balanceMinor: 0,
              refundedMinor: 0,
              payments,
              paymentMethods: [...new Set(payments.map((p) => p.methodId))],
              refunds: [],
              staffIds: [st.id],
              discountCode: "",
              notes: "",
              cashierUid: input.actorUid,
              cashierName: input.actorName,
              createdAt: at,
              updatedAt: at,
            },
          });
          if (client) {
            client.visits++;
            client.spend += ticket.totalMinor;
            client.first = client.first ? Math.min(client.first, endMs) : endMs;
            client.last = client.last ? Math.max(client.last, endMs) : endMs;
          }
        }
        set(apptRef, apptData);
        appointmentCount++;
        made++;
        cursor += total + pick([0, 0, 15, 15, 30, 45, 60]);
      }
    }
  }

  // Invoice numbers in chronological order, continuing any existing sequence.
  pendingTx.sort((a, b) => a.at - b.at);
  const counterRef = orgCol(orgId, "counters").doc("invoice");
  const existingCount = Number((await counterRef.get()).get("value") ?? 0);
  const prefix = settings.receipts.invoicePrefix;
  pendingTx.forEach((tx, i) => set(tx.ref, { ...tx.data, number: `${prefix}${String(existingCount + i + 1).padStart(6, "0")}` }));
  void writer.set(counterRef, { value: existingCount + pendingTx.length }, { merge: true });

  // Clients with their stats.
  for (const c of clients) {
    set(orgCol(orgId, "clients").doc(c.id), {
      ...c.data,
      stats: {
        visits: c.visits,
        totalSpendMinor: c.spend,
        lastVisitAt: c.last ? Timestamp.fromMillis(c.last) : null,
        firstVisitAt: c.first ? Timestamp.fromMillis(c.first) : null,
        nextAppointmentAt: c.next ? Timestamp.fromMillis(c.next) : null,
        noShows: c.noShows,
        cancellations: c.cancellations,
      },
      createdAt: Timestamp.fromMillis((c.first ?? now) - 2 * 86_400_000),
      updatedAt: created,
    });
  }

  // Products with stock after sales, plus opening and sale movements.
  for (const p of products) {
    const opening = p.stock + p.sold;
    set(orgCol(orgId, "products").doc(p.id), {
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      nameAr: "",
      brand: p.brand,
      categoryId: productCategoryIds.get(p.category),
      supplierId: supplierIds.get(p.supplier),
      costMinor: M(p.cost),
      priceMinor: M(p.price),
      taxRateId: null,
      taxExempt: false,
      minStock: p.minStock,
      trackStock: true,
      usage: p.usage,
      active: true,
      stock: { [branchId]: p.stock, [barsha.id]: Math.max(0, Math.round(p.stock / 2)) },
      createdAt: created,
      updatedAt: created,
    });
    const movement = (type: string, quantity: number, balanceAfter: number, note: string, at: number) =>
      set(orgCol(orgId, "inventoryMovements").doc(), {
        productId: p.id,
        productName: `${p.brand} ${p.name}`,
        branchId,
        type,
        quantity,
        balanceAfter,
        unitCostMinor: M(p.cost),
        transactionId: null,
        note,
        createdByUid: input.actorUid,
        createdByName: input.actorName,
        createdAt: Timestamp.fromMillis(at),
      });
    movement("purchase", opening, opening, "Opening stock", now - (pastDays + 2) * 86_400_000);
    if (p.sold > 0) movement("sale", -p.sold, p.stock, `Retail sales (${p.sold})`, now - 86_400_000);
  }

  // ── Expenses ──────────────────────────────────────────────────────────
  const expenseCats = await orgCol(orgId, "expenseCategories").get();
  const catId = (name: string) => expenseCats.docs.find((d) => d.get("name") === name)?.id ?? expenseCats.docs[0]?.id ?? "";
  const expense = (dayKey: string, category: string, amount: number, vendor: string, description: string, method: string, branch = branchId) => {
    const amountMinor = M(amount);
    set(orgCol(orgId, "expenses").doc(), {
      branchId: branch,
      dateKey: dayKey,
      date: Timestamp.fromDate(zonedInstant(dayKey, "12:00", tz)),
      categoryId: catId(category),
      categoryName: category,
      amountMinor,
      taxMinor: category === "Rent" || category === "Salaries" ? 0 : splitTax(amountMinor, vatBps, true).taxMinor,
      vendor,
      supplierId: null,
      paymentMethod: method,
      description,
      attachment: null,
      createdByUid: input.actorUid,
      createdByName: input.actorName,
      createdAt: Timestamp.fromDate(zonedInstant(dayKey, "12:00", tz)),
    });
  };
  const thisMonth = `${today.slice(0, 7)}-01`;
  const lastMonth = `${addDaysToKey(thisMonth, -1).slice(0, 7)}-01`;
  for (const first of [thisMonth, lastMonth]) {
    expense(first, "Rent", 18000, "Al Wasl Properties", "Monthly rent — Jumeirah villa", "bank_transfer");
    expense(first, "Rent", 12500, "Barsha Heights Real Estate", "Monthly rent — Al Barsha", "bank_transfer", barsha.id);
    expense(addDaysToKey(first, 2), "Utilities", 2350, "DEWA", "Electricity & water", "bank_transfer");
    expense(addDaysToKey(first, 4), "Marketing", 1500, "Meta Platforms", "Instagram ads", "card");
  }
  expense(addDaysToKey(lastMonth, 27), "Salaries", 46000, "Payroll", "Monthly salaries (WPS)", "bank_transfer");
  for (let w = 0; w < Math.floor(pastDays / 7); w++) {
    expense(addDaysToKey(today, -w * 7 - 2), "Supplies", 600 + Math.floor(rand() * 900), "Beauty Pro Supplies LLC", "Consumables restock", pick(["card", "cash"]));
  }
  expense(addDaysToKey(today, -9), "Maintenance", 850, "Cool Breeze AC Services", "AC servicing", "cash");

  // ── Packages, memberships, gift cards, discounts, commission rules ──
  const svc = (key: string) => services.find((s) => s.key === key)!;
  const monthAgo = Timestamp.fromMillis(now - 20 * 86_400_000);
  const pkgMassage = orgCol(orgId, "packages").doc();
  const pkgBlow = orgCol(orgId, "packages").doc();
  const pkgCredit = orgCol(orgId, "packages").doc();
  set(pkgMassage, { name: "10 Massage Sessions", nameAr: "10 جلسات مساج", description: "Ten 60-minute Swedish massages.", kind: "services", priceMinor: M(3000), validityDays: 365, items: [{ serviceId: svc("swedish").id, serviceName: svc("swedish").name, quantity: 10 }], creditMinor: 0, active: true, sortOrder: 0, createdAt: created });
  set(pkgBlow, { name: "8 Blow-Dry Sessions", nameAr: "8 جلسات تصفيف", description: "Eight blow-dries at a saving.", kind: "services", priceMinor: M(800), validityDays: 180, items: [{ serviceId: svc("blowdry").id, serviceName: svc("blowdry").name, quantity: 8 }], creditMinor: 0, active: true, sortOrder: 1, createdAt: created });
  set(pkgCredit, { name: "AED 1,000 Package Credit", nameAr: "رصيد 1,000 درهم", description: "Pay AED 900, spend AED 1,000 on any service.", kind: "credit", priceMinor: M(900), validityDays: 365, items: [], creditMinor: M(1000), active: true, sortOrder: 2, createdAt: created });

  const gold = orgCol(orgId, "membershipPlans").doc();
  const platinum = orgCol(orgId, "membershipPlans").doc();
  set(gold, { name: "Gold Membership", nameAr: "العضوية الذهبية", description: "Two blow-dries a month plus member discounts.", priceMinor: M(300), period: "monthly", serviceDiscountBps: 1000, productDiscountBps: 500, includedServices: [{ serviceId: svc("blowdry").id, serviceName: svc("blowdry").name, quantity: 2 }], active: true, createdAt: created });
  set(platinum, { name: "Platinum Membership", nameAr: "العضوية البلاتينية", description: "Monthly facial and manicure with 15% off everything else.", priceMinor: M(750), period: "monthly", serviceDiscountBps: 1500, productDiscountBps: 1000, includedServices: [{ serviceId: svc("facial_classic").id, serviceName: svc("facial_classic").name, quantity: 1 }, { serviceId: svc("gel_manicure").id, serviceName: svc("gel_manicure").name, quantity: 1 }], active: true, createdAt: created });
  clients.slice(0, 3).forEach((c, i) => {
    set(orgCol(orgId, "clientMemberships").doc(), {
      clientId: c.id,
      clientName: c.fullName,
      planId: i === 0 ? platinum.id : gold.id,
      planName: i === 0 ? "Platinum Membership" : "Gold Membership",
      startAt: monthAgo,
      endAt: Timestamp.fromMillis(monthAgo.toMillis() + 30 * 86_400_000),
      status: "active",
      autoRenew: true,
      transactionId: null,
      serviceDiscountBps: i === 0 ? 1500 : 1000,
      productDiscountBps: i === 0 ? 1000 : 500,
      createdAt: monthAgo,
    });
  });
  clients.slice(3, 7).forEach((c, i) => {
    const massage = i % 2 === 0;
    const service = massage ? svc("swedish") : svc("blowdry");
    set(orgCol(orgId, "clientPackages").doc(), {
      clientId: c.id,
      clientName: c.fullName,
      packageId: massage ? pkgMassage.id : pkgBlow.id,
      name: massage ? "10 Massage Sessions" : "8 Blow-Dry Sessions",
      kind: "services",
      purchasedAt: monthAgo,
      expiresAt: Timestamp.fromMillis(monthAgo.toMillis() + (massage ? 365 : 180) * 86_400_000),
      transactionId: null,
      items: [{ serviceId: service.id, serviceName: service.name, total: massage ? 10 : 8, used: 2 + i }],
      creditMinor: 0,
      creditUsedMinor: 0,
      status: "active",
      redemptions: [],
      createdAt: monthAgo,
    });
  });
  set(orgCol(orgId, "clientPackages").doc(), {
    clientId: clients[8]!.id,
    clientName: clients[8]!.fullName,
    packageId: pkgCredit.id,
    name: "AED 1,000 Package Credit",
    kind: "credit",
    purchasedAt: monthAgo,
    expiresAt: Timestamp.fromMillis(monthAgo.toMillis() + 365 * 86_400_000),
    transactionId: null,
    items: [],
    creditMinor: M(1000),
    creditUsedMinor: M(370),
    status: "active",
    redemptions: [],
    createdAt: monthAgo,
  });

  const giftCards: [string, number, number, string, string][] = [
    ["DGC-7K4P-9QX2", 500, 500, clients[9]!.fullName, "Happy birthday, Dana!"],
    ["DGC-M3RT-2HVB", 300, 120, clients[12]!.fullName, "Enjoy a pamper day"],
    ["DGC-Q8WN-5ZLC", 1000, 1000, "Hessa Al Suwaidi", "Congratulations on your engagement"],
  ];
  for (const [code, initial, balance, recipient, message] of giftCards) {
    set(orgCol(orgId, "giftCards").doc(), {
      code,
      codeNormalized: code.replace(/[^A-Z0-9]/gi, "").toUpperCase(),
      initialMinor: M(initial),
      balanceMinor: M(balance),
      issuedAt: monthAgo,
      expiresAt: Timestamp.fromMillis(now + 330 * 86_400_000),
      purchaserClientId: clients[1]!.id,
      purchaserName: clients[1]!.fullName,
      recipientName: recipient,
      recipientEmail: "",
      message,
      status: "active",
      transactionId: null,
      redemptions: balance < initial ? [{ at: Timestamp.fromMillis(now - 5 * 86_400_000), amountMinor: M(initial - balance), transactionId: null }] : [],
      createdAt: monthAgo,
    });
  }
  set(orgCol(orgId, "discounts").doc(), { name: "Welcome 10%", code: "WELCOME10", kind: "percent", valueBps: 1000, valueMinor: 0, appliesTo: "services", startsAt: null, endsAt: null, maxUses: null, usedCount: 14, active: true, createdAt: created });
  set(orgCol(orgId, "discounts").doc(), { name: "Summer glow", code: "GLOW50", kind: "fixed", valueBps: 0, valueMinor: M(50), appliesTo: "all", startsAt: null, endsAt: addDaysToKey(today, 30), maxUses: 200, usedCount: 37, active: true, createdAt: created });
  set(orgCol(orgId, "commissionRules").doc(), { name: "Colour services — 12%", itemType: "service", staffId: null, serviceId: svc("colour_full").id, rateBps: 1200, priority: 10, active: true, createdAt: created });
  set(orgCol(orgId, "commissionRules").doc(), { name: "Retail sales — 8%", itemType: "product", staffId: null, serviceId: null, rateBps: 800, priority: 5, active: true, createdAt: created });

  // ── Attendance (last 6 days) ──────────────────────────────────────────
  for (let offset = -6; offset <= -1; offset++) {
    const dayKey = addDaysToKey(today, offset);
    for (const st of staffList) {
      if (weekdayOfKey(dayKey) === st.dayOff) continue;
      const inMin = timeToMinutes(st.shift[0]) - 10 + Math.floor(rand() * 20);
      const outMin = timeToMinutes(st.shift[1]) - 5 + Math.floor(rand() * 20);
      const breakStart = timeToMinutes(st.shift[0]) + 240;
      const at = (m: number) => Timestamp.fromDate(zonedInstant(dayKey, minutesToTime(m), tz));
      set(orgCol(orgId, "attendance").doc(), {
        staffId: st.id,
        staffName: st.name,
        branchId: branchOf(st.key),
        dateKey: dayKey,
        clockInAt: at(inMin),
        clockOutAt: at(outMin),
        breaks: [{ startAt: at(breakStart), endAt: at(breakStart + 60) }],
        workedMinutes: outMin - inMin - 60,
        status: "closed",
        corrections: [],
        createdAt: created,
      });
    }
  }

  set(orgCol(orgId, "auditLogs").doc(), {
    action: "demo.seeded",
    entity: "organization",
    entityId: orgId,
    summary: `Demo data loaded: ${appointmentCount} appointments, ${pendingTx.length} invoices`,
    branchId: null,
    actorUid: input.actorUid,
    actorName: input.actorName,
    at: created,
  });

  await writer.close();
  return {
    appointments: appointmentCount,
    transactions: pendingTx.length,
    staffIds: Object.fromEntries(staffIds),
    secondBranchId: barsha.id,
  };
}
