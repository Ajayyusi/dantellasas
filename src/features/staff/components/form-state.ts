import type { BranchDTO, StaffDTO } from "@/lib/types";

import type { StaffInput } from "../schema";
import { STAFF_COLORS, WEEKDAY_KEYS, type WeekdayKey } from "../utils";

export interface DayState {
  working: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

export interface StaffFormState {
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  email: string;
  position: string;
  branchIds: string[];
  status: StaffDTO["status"];
  color: string;
  hireDate: string;
  bookable: boolean;
  schedule: Record<WeekdayKey, DayState>;
  /** Percent as typed ("12.5"); converted to basis points on save. */
  commission: { service: string; product: string };
  hr: { dateOfBirth: string; nationality: string; passportExpiry: string; visaExpiry: string };
  serviceIds: string[];
}

const pct = (bps: number) => (bps ? String(bps / 100) : "");
const toBps = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

export function fromStaff(s: StaffDTO): StaffFormState {
  return {
    firstName: s.firstName,
    lastName: s.lastName,
    displayName: s.displayName === `${s.firstName} ${s.lastName}`.trim() ? "" : s.displayName,
    phone: s.phone,
    email: s.email,
    position: s.position,
    branchIds: s.branchIds,
    status: s.status,
    color: s.color,
    hireDate: s.hireDate ?? "",
    bookable: s.bookable,
    schedule: Object.fromEntries(
      WEEKDAY_KEYS.map((k) => {
        const d = s.schedule[k];
        return [
          k,
          {
            working: d?.working ?? false,
            start: d?.start ?? "10:00",
            end: d?.end ?? "20:00",
            breakStart: d?.breakStart ?? "",
            breakEnd: d?.breakEnd ?? "",
          },
        ];
      }),
    ) as Record<WeekdayKey, DayState>,
    commission: { service: pct(s.commission.serviceRateBps), product: pct(s.commission.productRateBps) },
    hr: {
      dateOfBirth: s.hr.dateOfBirth ?? "",
      nationality: s.hr.nationality,
      passportExpiry: s.hr.passportExpiry ?? "",
      visaExpiry: s.hr.visaExpiry ?? "",
    },
    serviceIds: s.serviceIds,
  };
}

/** New staff member: works the selected branch's opening hours. */
export function emptyStaff(branch: BranchDTO | undefined, colorIndex: number, serviceIds: string[]): StaffFormState {
  return {
    firstName: "",
    lastName: "",
    displayName: "",
    phone: "",
    email: "",
    position: "",
    branchIds: branch ? [branch.id] : [],
    status: "active",
    color: STAFF_COLORS[colorIndex % STAFF_COLORS.length]!,
    hireDate: "",
    bookable: true,
    schedule: Object.fromEntries(
      WEEKDAY_KEYS.map((k) => {
        const h = branch?.workingHours?.[k];
        return [
          k,
          {
            working: h ? h.open : k !== "5",
            start: h?.start || "10:00",
            end: h?.end || "20:00",
            breakStart: "",
            breakEnd: "",
          },
        ];
      }),
    ) as Record<WeekdayKey, DayState>,
    commission: { service: "", product: "" },
    hr: { dateOfBirth: "", nationality: "", passportExpiry: "", visaExpiry: "" },
    serviceIds,
  };
}

export function toInput(f: StaffFormState, id?: string): StaffInput {
  return {
    id,
    firstName: f.firstName,
    lastName: f.lastName,
    displayName: f.displayName,
    phone: f.phone,
    email: f.email.trim(),
    position: f.position,
    branchIds: f.branchIds,
    status: f.status,
    color: f.color,
    hireDate: f.hireDate || null,
    bookable: f.bookable,
    schedule: Object.fromEntries(
      WEEKDAY_KEYS.map((k) => {
        const d = f.schedule[k];
        const hasBreak = d.breakStart && d.breakEnd;
        return [
          k,
          {
            working: d.working,
            start: d.start,
            end: d.end,
            ...(hasBreak ? { breakStart: d.breakStart, breakEnd: d.breakEnd } : {}),
          },
        ];
      }),
    ) as StaffInput["schedule"],
    commission: { serviceRateBps: toBps(f.commission.service), productRateBps: toBps(f.commission.product) },
    hr: {
      dateOfBirth: f.hr.dateOfBirth || null,
      nationality: f.hr.nationality,
      passportExpiry: f.hr.passportExpiry || null,
      visaExpiry: f.hr.visaExpiry || null,
    },
    serviceIds: f.serviceIds,
  };
}
