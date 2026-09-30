"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  HistoryIcon,
  PencilIcon,
  PinIcon,
  StickyNoteIcon,
  Trash2Icon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { useI18n } from "@/lib/i18n/client";

import type { ClientActivityView } from "../../types";

const ICONS: Record<string, LucideIcon> = {
  created: UserPlusIcon,
  updated: PencilIcon,
  archived: ArchiveIcon,
  restored: ArchiveRestoreIcon,
  note_added: StickyNoteIcon,
  note_pinned: PinIcon,
  note_unpinned: PinIcon,
  note_deleted: Trash2Icon,
};

const KNOWN = new Set(Object.keys(ICONS));
/** Audited client fields with a label in `clients.fields.*`. */
const FIELD_KEYS = new Set([
  "firstName",
  "lastName",
  "phone",
  "email",
  "birthday",
  "gender",
  "nationality",
  "source",
  "tags",
  "notes",
  "preferredStaffId",
  "marketingConsent",
]);

/** Audit timeline for this client (entity == "client"), newest first. */
export function ActivityTab({ activity }: { activity: ClientActivityView[] }) {
  const { t, te } = useI18n();
  const org = useOrg();

  if (activity.length === 0) {
    return (
      <div className="rounded-2xl border bg-card">
        <EmptyState icon={HistoryIcon} title={t("clients.activity.empty")} />
      </div>
    );
  }

  return (
    <ol className="relative grid max-w-3xl grid-cols-1 gap-0 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      {activity.map((a, i) => {
        const verb = a.action.startsWith("client.") ? a.action.slice(7) : a.action;
        const Icon = ICONS[verb] ?? HistoryIcon;
        const label = KNOWN.has(verb) ? te(`clients.activity.actions.${verb}`) : a.action;
        const fields = a.changedFields.filter((f) => FIELD_KEYS.has(f)).map((f) => te(`clients.fields.${f}`));
        const showSummary = verb.startsWith("note_") && a.summary.includes(": ");
        return (
          <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < activity.length - 1 ? <span className="absolute start-[15px] top-8 bottom-0 w-px bg-border" aria-hidden /> : null}
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary ring-4 ring-card">
              <Icon className="size-4" />
            </span>
            <div className="grid min-w-0 gap-0.5 pt-1">
              <p className="text-[15px]">
                <span className="font-semibold">{label}</span>
                <span className="text-muted-foreground"> · {a.actorName || "—"}</span>
              </p>
              {fields.length > 0 ? (
                <p className="text-[14px] text-muted-foreground">{t("clients.activity.changed", { fields: fields.join(", ") })}</p>
              ) : null}
              {showSummary ? (
                <p className="line-clamp-2 text-[14px] text-muted-foreground" dir="auto">
                  {a.summary.slice(a.summary.indexOf(": ") + 2)}
                </p>
              ) : null}
              <time className="text-xs text-muted-foreground" dateTime={a.at ?? undefined}>
                {org.date(a.at, "datetime")}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
