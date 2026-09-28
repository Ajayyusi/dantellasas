import type { AppointmentStatus, SaleItemType, TransactionStatus } from "@/lib/types";

/** One appointment line performed by a staff member (profile tabs). */
export interface StaffLine {
  id: string;
  appointmentId: string;
  branchId: string;
  dateKey: string;
  startAt: string;
  durationMin: number;
  serviceName: string;
  clientName: string;
  status: AppointmentStatus;
  priceMinor: number;
}

/** One invoice line credited to a staff member. */
export interface StaffSaleLine {
  id: string;
  transactionId: string;
  number: string;
  dateKey: string;
  clientName: string;
  name: string;
  type: SaleItemType;
  quantity: number;
  amountMinor: number;
  commissionMinor: number;
  status: TransactionStatus;
}

export interface StaffMonthStats {
  performed: number;
  bookedMinutes: number;
  scheduledMinutes: number;
  /** null when the member can't view sales/commissions */
  revenueMinor: number | null;
  commissionMinor: number | null;
}
