import "server-only";

import { arr, iso, isoRequired, num, str, strOrNull, type Data } from "@/lib/db";
import type { AppointmentDTO, AppointmentItemDTO, BlockedTimeDTO } from "@/lib/types";

export function toAppointment(id: string, d: Data): AppointmentDTO {
  const items = arr<Data>(d.items).map(
    (i): AppointmentItemDTO => ({
      id: str(i.id),
      serviceId: str(i.serviceId),
      serviceName: str(i.serviceName),
      staffId: str(i.staffId),
      staffName: str(i.staffName),
      startAt: isoRequired(i.startAt),
      durationMin: num(i.durationMin, 30),
      priceMinor: num(i.priceMinor),
      discountMinor: num(i.discountMinor),
    }),
  );
  const cancellation = d.cancellation as Data | null | undefined;
  return {
    id,
    branchId: str(d.branchId),
    dateKey: str(d.dateKey),
    startAt: isoRequired(d.startAt),
    endAt: isoRequired(d.endAt),
    status: (d.status as AppointmentDTO["status"]) ?? "booked",
    source: (d.source as AppointmentDTO["source"]) ?? "phone",
    clientId: strOrNull(d.clientId),
    clientName: str(d.clientName),
    clientPhone: str(d.clientPhone),
    items,
    staffIds: arr<string>(d.staffIds),
    totalMinor: num(d.totalMinor),
    notes: str(d.notes),
    cancellation: cancellation
      ? { reason: str(cancellation.reason), note: str(cancellation.note), at: iso(cancellation.at) }
      : null,
    transactionId: strOrNull(d.transactionId),
    createdAt: iso(d.createdAt),
  };
}

export function toBlockedTime(id: string, d: Data): BlockedTimeDTO {
  return {
    id,
    branchId: str(d.branchId),
    staffId: str(d.staffId),
    dateKey: str(d.dateKey),
    startAt: isoRequired(d.startAt),
    endAt: isoRequired(d.endAt),
    reason: str(d.reason),
  };
}
