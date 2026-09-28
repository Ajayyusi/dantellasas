import "server-only";

import { arr, iso, num, str, strOrNull, type Data } from "@/lib/db";
import type { PaymentMethodType } from "@/lib/settings";
import type { PaymentDTO, RefundDTO, SaleItemDTO, TransactionDTO } from "@/lib/types";

export function toTransaction(id: string, d: Data): TransactionDTO {
  return {
    id,
    number: str(d.number),
    branchId: str(d.branchId),
    dateKey: str(d.dateKey),
    status: (d.status as TransactionDTO["status"]) ?? "paid",
    clientId: strOrNull(d.clientId),
    clientName: str(d.clientName),
    appointmentId: strOrNull(d.appointmentId),
    items: arr<Data>(d.items).map(
      (i): SaleItemDTO => ({
        id: str(i.id),
        type: (i.type as SaleItemDTO["type"]) ?? "service",
        refId: str(i.refId),
        name: str(i.name),
        staffId: strOrNull(i.staffId),
        staffName: str(i.staffName),
        quantity: num(i.quantity, 1),
        unitPriceMinor: num(i.unitPriceMinor),
        discountMinor: num(i.discountMinor),
        taxRateBps: num(i.taxRateBps),
        taxMinor: num(i.taxMinor),
        totalMinor: num(i.totalMinor),
        commissionMinor: num(i.commissionMinor),
      }),
    ),
    subtotalMinor: num(d.subtotalMinor),
    discountMinor: num(d.discountMinor),
    taxMinor: num(d.taxMinor),
    totalMinor: num(d.totalMinor),
    tipMinor: num(d.tipMinor),
    tipStaffId: strOrNull(d.tipStaffId),
    paidMinor: num(d.paidMinor),
    balanceMinor: num(d.balanceMinor),
    refundedMinor: num(d.refundedMinor),
    payments: arr<Data>(d.payments).map(
      (p): PaymentDTO => ({
        id: str(p.id),
        methodId: str(p.methodId),
        methodType: (p.methodType as PaymentMethodType) ?? "other",
        label: str(p.label),
        amountMinor: num(p.amountMinor),
        reference: str(p.reference),
        at: iso(p.at),
      }),
    ),
    paymentMethods: arr<string>(d.paymentMethods),
    refunds: arr<Data>(d.refunds).map(
      (r): RefundDTO => ({
        id: str(r.id),
        number: str(r.number),
        amountMinor: num(r.amountMinor),
        reason: str(r.reason),
        methodId: str(r.methodId),
        at: iso(r.at),
        byName: str(r.byName),
      }),
    ),
    staffIds: arr<string>(d.staffIds),
    discountCode: str(d.discountCode),
    notes: str(d.notes),
    cashierName: str(d.cashierName),
    createdAt: iso(d.createdAt),
  };
}
