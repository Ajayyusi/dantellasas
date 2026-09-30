import "server-only";

import { arr, bool, num, str, strOrNull, type Data } from "@/lib/db";
import type { ServiceCategoryDTO, ServiceDTO } from "@/lib/types";

export function toCategory(id: string, d: Data): ServiceCategoryDTO {
  return {
    id,
    name: str(d.name),
    nameAr: str(d.nameAr),
    color: str(d.color, "#a8406a"),
    sortOrder: num(d.sortOrder),
    active: bool(d.active, true),
  };
}

export function toService(id: string, d: Data): ServiceDTO {
  return {
    id,
    categoryId: str(d.categoryId),
    name: str(d.name),
    nameAr: str(d.nameAr),
    description: str(d.description),
    durationMin: num(d.durationMin, 60),
    bufferMin: num(d.bufferMin),
    priceMinor: num(d.priceMinor),
    taxRateId: strOrNull(d.taxRateId),
    taxExempt: bool(d.taxExempt),
    branchIds: arr<string>(d.branchIds),
    staffIds: arr<string>(d.staffIds),
    onlineBookable: bool(d.onlineBookable, true),
    active: bool(d.active, true),
    sortOrder: num(d.sortOrder),
  };
}
