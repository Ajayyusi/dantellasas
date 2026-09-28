import "server-only";

import { arr, bool, iso, num, str, strOrNull, type Data } from "@/lib/db";
import type { ClientDTO, ClientNoteDTO } from "@/lib/types";

export function toClient(id: string, d: Data): ClientDTO {
  const stats = (d.stats ?? {}) as Data;
  const birthday = d.birthday as ClientDTO["birthday"] | undefined;
  return {
    id,
    firstName: str(d.firstName),
    lastName: str(d.lastName),
    fullName: str(d.fullName) || `${str(d.firstName)} ${str(d.lastName)}`.trim(),
    phone: str(d.phone),
    email: str(d.email),
    birthday: birthday && birthday.month && birthday.day ? birthday : null,
    gender: (str(d.gender) as ClientDTO["gender"]) || "",
    nationality: str(d.nationality),
    source: str(d.source),
    tags: arr<string>(d.tags),
    notes: str(d.notes),
    preferredStaffId: strOrNull(d.preferredStaffId),
    marketingConsent: bool(d.marketingConsent),
    status: d.status === "archived" ? "archived" : "active",
    stats: {
      visits: num(stats.visits),
      totalSpendMinor: num(stats.totalSpendMinor),
      lastVisitAt: iso(stats.lastVisitAt),
      firstVisitAt: iso(stats.firstVisitAt),
      nextAppointmentAt: iso(stats.nextAppointmentAt),
      noShows: num(stats.noShows),
      cancellations: num(stats.cancellations),
    },
    createdAt: iso(d.createdAt),
  };
}

export function toClientNote(id: string, d: Data): ClientNoteDTO {
  return {
    id,
    body: str(d.body),
    pinned: bool(d.pinned),
    authorName: str(d.authorName),
    createdAt: iso(d.createdAt),
  };
}
