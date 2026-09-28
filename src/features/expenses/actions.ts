"use server";

import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

import { action, fail } from "@/lib/actions";
import { audit, diff } from "@/lib/audit";
import { db, orgCol, ts } from "@/lib/db";
import { zonedInstant } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { deleteTenantFile, RECEIPT_TYPES, uploadTenantFile, type StoredFile } from "@/lib/storage";
import { actorName, canAccessBranch } from "@/lib/tenancy/context";

import { expenseCategoryInput, expenseInput, RECEIPT_MAX_MB } from "./schema";

const idInput = z.object({ id: z.string().min(1) });

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const AUDITED = [
  "branchId",
  "dateKey",
  "categoryId",
  "amountMinor",
  "taxMinor",
  "vendor",
  "supplierId",
  "paymentMethod",
  "description",
];

/**
 * Create or update an expense. Takes FormData so a receipt can travel with
 * the form: `payload` (JSON matching `expenseInput`) and an optional `file`.
 */
export const saveExpenseAction = action(
  { schema: z.instanceof(FormData), permission: "create_expenses" },
  async (fd, ctx) => {
    let raw: unknown = null;
    try {
      raw = JSON.parse(String(fd.get("payload") ?? "null"));
    } catch {
      fail("errors.validation");
    }
    const parsed = expenseInput.safeParse(raw);
    if (!parsed.success) fail("errors.validation", fieldErrorsOf(parsed.error));
    const input = parsed.data;
    const fileEntry = fd.get("file");
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

    if (!canAccessBranch(ctx, input.branchId)) fail("errors.branchForbidden");

    const categorySnap = await orgCol(ctx.org.id, "expenseCategories").doc(input.categoryId).get();
    if (!categorySnap.exists) fail("errors.validation", { categoryId: "validation.invalid" });
    const categoryName = String(categorySnap.get("name") ?? "");

    if (input.paymentMethod && !ctx.settings.payments.methods.some((m) => m.id === input.paymentMethod)) {
      fail("errors.validation", { paymentMethod: "validation.invalid" });
    }

    let vendor = input.vendor;
    if (input.supplierId) {
      const supplier = await orgCol(ctx.org.id, "suppliers").doc(input.supplierId).get();
      if (!supplier.exists) fail("errors.validation", { supplierId: "validation.invalid" });
      if (!vendor) vendor = String(supplier.get("name") ?? "");
    }

    const col = orgCol(ctx.org.id, "expenses");
    const ref = input.id ? col.doc(input.id) : col.doc();
    const before = input.id ? await ref.get() : null;
    if (before && !before.exists) fail("errors.notFound");
    if (before && !canAccessBranch(ctx, String(before.get("branchId") ?? ""))) fail("errors.branchForbidden");
    const previousAttachment = (before?.get("attachment") ?? null) as { path?: string } | null;

    let stored: StoredFile | null = null;
    if (file) {
      stored = await uploadTenantFile(ctx, "expenses", file, { maxMB: RECEIPT_MAX_MB, types: RECEIPT_TYPES });
    }
    const attachment = stored
      ? { path: stored.path, name: stored.name, contentType: stored.contentType, size: stored.size, url: stored.url }
      : input.removeAttachment
        ? null
        : previousAttachment;

    const data = {
      branchId: input.branchId,
      dateKey: input.dateKey,
      date: ts(zonedInstant(input.dateKey, "12:00", ctx.timezone)),
      categoryId: input.categoryId,
      categoryName,
      amountMinor: input.amountMinor,
      taxMinor: input.taxMinor,
      vendor,
      supplierId: input.supplierId,
      paymentMethod: input.paymentMethod,
      description: input.description,
      attachment,
      updatedAt: FieldValue.serverTimestamp(),
    };
    const summary = `${categoryName} · ${formatMoney(input.amountMinor, ctx.currency)}${vendor ? ` · ${vendor}` : ""}`;

    const batch = db().batch();
    if (before) {
      batch.update(ref, data);
      audit(
        ctx,
        {
          action: "expense.updated",
          entity: "expense",
          entityId: ref.id,
          branchId: input.branchId,
          summary,
          changes: {
            ...diff(before.data() ?? {}, data, AUDITED),
            ...(stored || input.removeAttachment ? { attachment: [previousAttachment?.path ?? null, stored?.name ?? null] } : {}),
          },
        },
        batch,
      );
    } else {
      batch.set(ref, {
        ...data,
        createdByUid: ctx.session.uid,
        createdByName: actorName(ctx),
        createdAt: FieldValue.serverTimestamp(),
      });
      audit(ctx, { action: "expense.created", entity: "expense", entityId: ref.id, branchId: input.branchId, summary }, batch);
    }
    try {
      await batch.commit();
    } catch (err) {
      if (stored) await deleteTenantFile(ctx, stored.path);
      throw err;
    }
    if (previousAttachment?.path && (stored || input.removeAttachment)) {
      await deleteTenantFile(ctx, previousAttachment.path);
    }
    return { id: ref.id };
  },
);

export const deleteExpenseAction = action(
  { schema: idInput, permission: "create_expenses" },
  async ({ id }, ctx) => {
    const ref = orgCol(ctx.org.id, "expenses").doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    const branchId = String(snap.get("branchId") ?? "");
    if (!canAccessBranch(ctx, branchId)) fail("errors.branchForbidden");
    const amount = Number(snap.get("amountMinor") ?? 0);
    const batch = db().batch();
    batch.delete(ref);
    audit(
      ctx,
      {
        action: "expense.deleted",
        entity: "expense",
        entityId: id,
        branchId,
        summary: `${String(snap.get("categoryName") ?? "")} · ${formatMoney(amount, ctx.currency)} · ${String(snap.get("dateKey") ?? "")}`,
      },
      batch,
    );
    await batch.commit();
    const path = (snap.get("attachment") as { path?: string } | null)?.path;
    if (path) await deleteTenantFile(ctx, path);
    return null;
  },
);

export const saveExpenseCategoryAction = action(
  { schema: expenseCategoryInput, permission: "create_expenses" },
  async (input, ctx) => {
    const col = orgCol(ctx.org.id, "expenseCategories");
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
          action: "expense_category.updated",
          entity: "expenseCategory",
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
    audit(ctx, { action: "expense_category.created", entity: "expenseCategory", entityId: ref.id, summary: input.name }, batch);
    await batch.commit();
    return { id: ref.id };
  },
);

export const setExpenseCategoryActiveAction = action(
  { schema: z.object({ id: z.string().min(1), active: z.boolean() }), permission: "create_expenses" },
  async ({ id, active }, ctx) => {
    const ref = orgCol(ctx.org.id, "expenseCategories").doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail("errors.notFound");
    const batch = db().batch();
    batch.update(ref, { active, updatedAt: FieldValue.serverTimestamp() });
    audit(
      ctx,
      {
        action: active ? "expense_category.activated" : "expense_category.deactivated",
        entity: "expenseCategory",
        entityId: id,
        summary: String(snap.get("name") ?? ""),
      },
      batch,
    );
    await batch.commit();
    return null;
  },
);
