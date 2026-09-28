import type { BlockedTimeDTO, ServiceCategoryDTO, ServiceDTO, StaffDTO } from "@/lib/types";

export type CalendarViewMode = "day" | "week" | "staff" | "list";

export interface CalendarStaff {
  id: string;
  displayName: string;
  color: string;
  photoUrl: string | null;
  schedule: StaffDTO["schedule"];
  serviceIds: string[];
}

export interface CalendarCatalog {
  services: ServiceDTO[];
  categories: ServiceCategoryDTO[];
  staff: CalendarStaff[];
}

export interface SlotTarget {
  date: string;
  start: string;
  staffId?: string;
}

export type { BlockedTimeDTO };
