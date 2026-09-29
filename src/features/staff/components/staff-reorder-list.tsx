"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SortableList } from "@/components/common/sortable-list";
import { PersonAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import type { StaffDTO } from "@/lib/types";

import { reorderStaffAction } from "../actions";

/** Drag (or move up/down) to set calendar column order. Saves on every change. */
export function StaffReorderList({ staff }: { staff: StaffDTO[] }) {
  const { t, te } = useI18n();
  const [items, setItems] = useState(staff);
  const [synced, setSynced] = useState(staff);
  if (synced !== staff) {
    setSynced(staff);
    setItems(staff);
  }

  async function save(ids: string[]) {
    const prev = items;
    setItems(ids.map((id) => items.find((s) => s.id === id)!).filter(Boolean));
    const res = await reorderStaffAction({ ids });
    if (res.ok) toast.success(t("staff.reordered"));
    else {
      setItems(prev);
      toast.error(te(res.error));
    }
  }

  const move = (index: number, delta: number) => {
    const ids = items.map((s) => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    void save(ids);
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <p className="border-b bg-muted/30 px-4 py-2.5 text-[14px] text-muted-foreground">{t("staff.reorderHint")}</p>
      <SortableList
        items={items}
        onReorder={save}
        className="divide-y"
        render={(s, handle) => {
          const i = items.findIndex((x) => x.id === s.id);
          return (
            <div className="flex items-center gap-3 bg-card px-3 py-2.5">
              {handle}
              <span className="w-6 text-center text-xs tabular text-muted-foreground">{i + 1}</span>
              <PersonAvatar name={s.displayName} src={s.photoUrl} color={s.color} className="size-8" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.displayName}</div>
                <div className="truncate text-[14px] text-muted-foreground">{s.position}</div>
              </div>
              <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("common.moveUp")}>
                <ArrowUpIcon />
              </Button>
              <Button variant="ghost" size="icon-sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t("common.moveDown")}>
                <ArrowDownIcon />
              </Button>
            </div>
          );
        }}
      />
    </div>
  );
}
