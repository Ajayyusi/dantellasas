"use server";

import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { db, orgCol } from "@/lib/db";
import { canAccessBranch } from "@/lib/tenancy/context";
import type { MovementType } from "@/lib/types";

import { toProduct } from "./mappers";
import { listProductMovements } from "./queries";
import { categoryInput, productInput, setActiveInput, stockOperationInput, supplierInput } from "./schema";
import { assertNotNegative, balanceAt, productRef, weightedAverageCost, writeBalances, writeMovement } from "./service";

const PERMISSION = "manage_inventory" as const;

// ── Products ───────────────────────────────────────────────────────────

const PRODUCT_AUDITED = [
  "sku",
  "barcode",
  "name",
  "nameAr",
  "brand",
  "categoryId",
  "supplierId",
  "costMinor",
  "priceMinor",
  "taxRateId",
  "taxExempt",
  "minStock",
  "trackStock",
  "usage",
  "active",
];

async function assertUnique(orgId: string, field: "sku" | "barcode", value: string, exceptId?: string) {
  if (!value) return;
  const snap = await orgCol(orgId, "products").where(field, "==", value).limit(2).get();
  if (snap.docs.some((d) => d.id !== exceptId)) {
    fail("errors.validation", { [field]: field === "sku" ? "inventory.errors.duplicateSku" : "inventory.errors.duplicateBarcode" });
  }
}

export const saveProductAction = action({ schema: productInput, permission: PERMISSION }, async (input, ctx) => {
  const data = {
    sku: input.sku,
    barcode: input.barcode,
    name: input.name,
    nameAr: input.nameAr,
    brand: input.brand,
    categoryId: input.categoryId,
    supplierId: input.supplierId,
    costMinor: input.costMinor,
    priceMinor: input.priceMinor,
    taxExempt: input.taxMode === "exempt",
    taxRateId: input.taxMode === "rate" ? input.taxRateId : null,
    minStock: input.minStock,
    trackStock: input.trackStock,
    usage: input.usage,
    active: input.active,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (data.taxRateId && !ctx.settings.tax.rates.some((r) => r.id === data.taxRateId)) {
    fail("errors.validation", { taxRateId: "validation.invalid" });
  }
  if (data.categoryId && !(await orgCol(ctx.org.id, "productCategories").doc(data.categoryId).get()).exists) {
    fail("errors.validation", { categoryId: "validation.invalid" });
  }
  if (data.supplierId && !(await orgCol(ctx.org.id, "suppliers").doc(data.supplierId).get()).exists) {
    fail("errors.validation", { supplierId: "validation.invalid" });
  }
  await assertUnique(ctx.org.id, "sku", input.sku, input.id);
  await assertUnique(ctx.org.id, "barcode", input.barcode, input.id);

  const col = orgCol(ctx.org.id, "products");
  const batch = db().batch();
  if (input.id) {
    const ref = col.doc(input.id);
    const before = await ref.get();
    if (!before.exists) fail("errors.notFound");
    batch.update(ref, data);
    audit(
      ctx,
      {
        action: "product.updated",
        entity: "product",
        entityId: ref.id,
        summary: input.name,
        changes: diff(before.data() ?? {}, data, PRODUCT_AUDITED),
      },
      batch,
    );
    await batch.commit();
    return { id: ref.id };
  }
  const ref = col.doc();
  batch.set(ref, { ...data, stock: {}, createdAt: FieldValue.serverTimestamp() });
  audit(ctx, { action: "product.created", entity: "product", entityId: ref.id, summary: input.name }, batch);
  await batch.commit();
  return { id: ref.id };
});

export const setProductActiveAction = action({ schema: setActiveInput, permission: PERMISSION }, async ({ id, active }, ctx) => {
  const ref = productRef(ctx.org.id, id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  const batch = db().batch();
  batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
  audit(
    ctx,
    { action: active ? "product.activated" : "product.deactivated", entity: "product", entityId: id, summary: String(snap.get("name") ?? "") },
    batch,
  );
  await batch.commit();
  return null;
});

/** Read-only: latest ledger entries for the product drawer. */
export const productHistoryAction = action(
  { schema: z.object({ productId: z.string().min(1) }), permission: PERMISSION, revalidate: false },
  async ({ productId }, ctx) => listProductMovements(ctx, productId),
);

// ── Product categories ─────────────────────────────────────────────────

export const saveProductCategoryAction = action({ schema: categoryInput, permission: PERMISSION }, async (input, ctx) => {
  const col = orgCol(ctx.org.id, "productCategories");
  const data = { name: input.name, nameAr: input.nameAr, updatedAt: FieldValue.serverTimestamp() };
  const batch = db().batch();
  if (input.id) {
    const ref = col.doc(input.id);
    const before = await ref.get();
    if (!before.exists) fail("errors.notFound");
    batch.update(ref, data);
    audit(
      ctx,
      {
        action: "product_category.updated",
        entity: "productCategory",
        entityId: ref.id,
        summary: input.name,
        changes: diff(before.data() ?? {}, data, ["name", "nameAr"]),
      },
      batch,
    );
    await batch.commit();
    return { id: ref.id };
  }
  const last = await col.orderBy("sortOrder", "desc").limit(1).get();
  const sortOrder = Number(last.docs[0]?.get("sortOrder") ?? -1) + 1;
  const ref = col.doc();
  batch.set(ref, { ...data, active: true, sortOrder, createdAt: FieldValue.serverTimestamp() });
  audit(ctx, { action: "product_category.created", entity: "productCategory", entityId: ref.id, summary: input.name }, batch);
  await batch.commit();
  return { id: ref.id };
});

export const setProductCategoryActiveAction = action({ schema: setActiveInput, permission: PERMISSION }, async ({ id, active }, ctx) => {
  const ref = orgCol(ctx.org.id, "productCategories").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  const batch = db().batch();
  batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
  audit(
    ctx,
    {
      action: active ? "product_category.activated" : "product_category.deactivated",
      entity: "productCategory",
      entityId: id,
      summary: String(snap.get("name") ?? ""),
    },
    batch,
  );
  await batch.commit();
  return null;
});

// ── Suppliers ──────────────────────────────────────────────────────────

const SUPPLIER_AUDITED = ["name", "contactName", "phone", "email", "trn", "notes", "active"];

export const saveSupplierAction = action({ schema: supplierInput, permission: PERMISSION }, async (input, ctx) => {
  const col = orgCol(ctx.org.id, "suppliers");
  const { id, ...fields } = input;
  const data = { ...fields, updatedAt: FieldValue.serverTimestamp() };
  const batch = db().batch();
  if (id) {
    const ref = col.doc(id);
    const before = await ref.get();
    if (!before.exists) fail("errors.notFound");
    batch.update(ref, data);
    audit(
      ctx,
      {
        action: "supplier.updated",
        entity: "supplier",
        entityId: id,
        summary: input.name,
        changes: diff(before.data() ?? {}, data, SUPPLIER_AUDITED),
      },
      batch,
    );
    await batch.commit();
    return { id };
  }
  const ref = col.doc();
  batch.set(ref, { ...data, createdAt: FieldValue.serverTimestamp() });
  audit(ctx, { action: "supplier.created", entity: "supplier", entityId: ref.id, summary: input.name }, batch);
  await batch.commit();
  return { id: ref.id };
});

export const setSupplierActiveAction = action({ schema: setActiveInput, permission: PERMISSION }, async ({ id, active }, ctx) => {
  const ref = orgCol(ctx.org.id, "suppliers").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  const batch = db().batch();
  batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
  audit(
    ctx,
    { action: active ? "supplier.activated" : "supplier.deactivated", entity: "supplier", entityId: id, summary: String(snap.get("name") ?? "") },
    batch,
  );
  await batch.commit();
  return null;
});

export const deleteSupplierAction = action({ schema: z.object({ id: z.string().min(1) }), permission: PERMISSION }, async ({ id }, ctx) => {
  const ref = orgCol(ctx.org.id, "suppliers").doc(id);
  const snap = await ref.get();
  if (!snap.exists) fail("errors.notFound");
  const [products, expenses] = await Promise.all([
    orgCol(ctx.org.id, "products").where("supplierId", "==", id).limit(1).get(),
    orgCol(ctx.org.id, "expenses").where("supplierId", "==", id).limit(1).get(),
  ]);
  if (!products.empty || !expenses.empty) fail("errors.cannotDeleteInUse");
  const batch = db().batch();
  batch.delete(ref);
  audit(ctx, { action: "supplier.deleted", entity: "supplier", entityId: id, summary: String(snap.get("name") ?? "") }, batch);
  await batch.commit();
  return null;
});

// ── Stock operations ───────────────────────────────────────────────────

/**
 * Receive, adjust, internal use, return and transfer. Each runs in one
 * transaction: read the product, compute the branch balance(s), update
 * `stock.{branchId}` and append the ledger entry (two for a transfer).
 */
export const stockOperationAction = action({ schema: stockOperationInput, permission: PERMISSION }, async (input, ctx) => {
  if (!canAccessBranch(ctx, input.branchId)) fail("errors.branchForbidden");
  if (input.op === "transfer") {
    if (!canAccessBranch(ctx, input.toBranchId)) fail("errors.branchForbidden");
    if (input.toBranchId === input.branchId) fail("errors.validation", { toBranchId: "inventory.errors.sameBranch" });
  }
  const ref = productRef(ctx.org.id, input.productId);

  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) fail("errors.notFound");
    const product = toProduct(snap.id, snap.data() ?? {});
    const before = balanceAt(product, input.branchId);
    const branchName = ctx.branches.find((b) => b.id === input.branchId)?.name ?? "";

    if (input.op === "transfer") {
      const transferId = randomUUID();
      const outBalance = before - input.quantity;
      assertNotNegative(product, outBalance);
      const inBalance = balanceAt(product, input.toBranchId) + input.quantity;
      writeBalances(tx, ref, { [input.branchId]: outBalance, [input.toBranchId]: inBalance });
      const common = { product, unitCostMinor: product.costMinor, note: input.note, transferId };
      writeMovement(tx, ctx, { ...common, branchId: input.branchId, type: "transfer_out", quantity: -input.quantity, balanceAfter: outBalance });
      writeMovement(tx, ctx, { ...common, branchId: input.toBranchId, type: "transfer_in", quantity: input.quantity, balanceAfter: inBalance });
      const toName = ctx.branches.find((b) => b.id === input.toBranchId)?.name ?? "";
      audit(
        ctx,
        {
          action: "stock.transferred",
          entity: "product",
          entityId: product.id,
          branchId: input.branchId,
          summary: `${product.name}: ${input.quantity} · ${branchName} → ${toName}`,
          changes: { [`stock.${input.branchId}`]: [before, outBalance], [`stock.${input.toBranchId}`]: [inBalance - input.quantity, inBalance] },
        },
        tx,
      );
      return { balance: outBalance };
    }

    let type: MovementType;
    let delta: number;
    let unitCost = product.costMinor;
    let extra: Record<string, unknown> = {};
    let auditAction = "stock.adjusted";
    switch (input.op) {
      case "receive":
        type = "purchase";
        delta = input.quantity;
        unitCost = input.unitCostMinor;
        extra = { costMinor: weightedAverageCost(product, input.quantity, input.unitCostMinor) };
        auditAction = "stock.received";
        break;
      case "adjust":
        type = "adjustment";
        delta = input.direction === "increase" ? input.quantity : -input.quantity;
        break;
      case "internal_use":
        type = "internal_use";
        delta = -input.quantity;
        break;
      case "return":
        type = "return";
        delta = input.direction === "from_client" ? input.quantity : -input.quantity;
        break;
    }
    const after = before + delta;
    assertNotNegative(product, after);
    writeBalances(tx, ref, { [input.branchId]: after }, extra);
    writeMovement(tx, ctx, {
      product,
      branchId: input.branchId,
      type,
      quantity: delta,
      balanceAfter: after,
      unitCostMinor: unitCost,
      note: input.note,
    });
    audit(
      ctx,
      {
        action: auditAction,
        entity: "product",
        entityId: product.id,
        branchId: input.branchId,
        summary: `${product.name}: ${delta > 0 ? "+" : ""}${delta} (${type})${input.note ? ` · ${input.note}` : ""}`,
        changes: {
          [`stock.${input.branchId}`]: [before, after],
          ...("costMinor" in extra ? { costMinor: [product.costMinor, extra.costMinor] } : {}),
        },
      },
      tx,
    );
    return { balance: after };
  });
});
