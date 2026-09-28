import "server-only";

import { arr, iso, num, str, type Data } from "@/lib/db";
import type { AttendanceDTO, LeaveDTO } from "@/lib/types";

export function toAttendance(id: string, d: Data): AttendanceDTO {
  return {
    id,
    staffId: str(d.staffId),
    staffName: str(d.staffName),
    branchId: str(d.branchId),
    dateKey: str(d.dateKey),
    clockInAt: iso(d.clockInAt),
    clockOutAt: iso(d.clockOutAt),
    breaks: arr<Data>(d.breaks).map((b) => ({ startAt: iso(b.startAt), endAt: iso(b.endAt) })),
    workedMinutes: num(d.workedMinutes),
    status: d.status === "closed" ? "closed" : "open",
    corrections: arr<Data>(d.corrections).map((c) => ({
      at: str(c.at),
      byName: str(c.byName),
      reason: str(c.reason),
    })),
  };
}

export function toLeave(id: string, d: Data): LeaveDTO {
  return {
    id,
    staffId: str(d.staffId),
    staffName: str(d.staffName),
    type: (["annual", "sick", "unpaid", "other"].includes(str(d.type)) ? d.type : "other") as LeaveDTO["type"],
    startDate: str(d.startDate),
    endDate: str(d.endDate),
    status: (["requested", "approved", "rejected"].includes(str(d.status)) ? d.status : "requested") as LeaveDTO["status"],
    note: str(d.note),
  };
}
