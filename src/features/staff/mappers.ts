import "server-only";

import { arr, bool, num, str, strOrNull, type Data } from "@/lib/db";
import { currentColor } from "@/lib/palette";
import type { StaffDTO, WeeklySchedule } from "@/lib/types";

export const DEFAULT_SCHEDULE: WeeklySchedule = Object.fromEntries(
  ["0", "1", "2", "3", "4", "5", "6"].map((d) => [
    d,
    { working: d !== "5", start: "10:00", end: "20:00", breakStart: "14:00", breakEnd: "15:00" },
  ]),
);

export function toStaff(id: string, d: Data, serviceIds: string[] = []): StaffDTO {
  const hr = (d.hr ?? {}) as Data;
  const commission = (d.commission ?? {}) as Data;
  return {
    id,
    firstName: str(d.firstName),
    lastName: str(d.lastName),
    displayName: str(d.displayName) || `${str(d.firstName)} ${str(d.lastName)}`.trim(),
    photoUrl: strOrNull(d.photoUrl),
    phone: str(d.phone),
    email: str(d.email),
    position: str(d.position),
    branchIds: arr<string>(d.branchIds),
    status: (d.status as StaffDTO["status"]) ?? "active",
    color: currentColor(str(d.color, "#a8406a")),
    hireDate: strOrNull(d.hireDate),
    bookable: bool(d.bookable, true),
    schedule: { ...DEFAULT_SCHEDULE, ...((d.schedule ?? {}) as WeeklySchedule) },
    commission: {
      serviceRateBps: num(commission.serviceRateBps),
      productRateBps: num(commission.productRateBps),
    },
    hr: {
      dateOfBirth: strOrNull(hr.dateOfBirth),
      nationality: str(hr.nationality),
      passportExpiry: strOrNull(hr.passportExpiry),
      visaExpiry: strOrNull(hr.visaExpiry),
    },
    memberUid: strOrNull(d.memberUid),
    sortOrder: num(d.sortOrder),
    serviceIds,
  };
}
