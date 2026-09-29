"use client";

import { ArchiveIcon, ArchiveRestoreIcon, InfoIcon, PlusIcon, TagIcon, UsersIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { DataTable } from "@/components/data-table/data-table";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { useI18n } from "@/lib/i18n/client";
import type { ClientDTO } from "@/lib/types";

import { setClientStatusAction } from "../actions";
import type { StaffOption } from "../types";
import { clientSearchText } from "../utils";
import { BulkTagDialog } from "./bulk-tag-dialog";
import { useClientTable } from "./client-columns";
import { ClientFormSheet } from "./client-form-sheet";
import { ClientServerSearch } from "./client-server-search";

/** Every row on a tab shares its status, so the column starts hidden. */
const CLIENT_HIDDEN_COLUMNS = { status: false };

export function ClientsView({
  clients,
  status,
  capped,
  cap,
  staff,
  openNew,
  now,
}: {
  clients: ClientDTO[];
  status: ClientDTO["status"];
  capped: boolean;
  cap: number;
  staff: StaffOption[];
  /** `?new=1` — open the create sheet (e.g. from the top bar or ⌘K). */
  openNew: boolean;
  now: number;
}) {
  const { t, te, locale } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const canCreate = org.can("create_customers");
  const canEdit = org.can("edit_customers");
  const canExport = org.can("export_data");

  const [sheetOpen, setSheetOpen] = useState(openNew && canCreate);
  const [syncedOpenNew, setSyncedOpenNew] = useState(openNew);
  if (syncedOpenNew !== openNew) {
    // `?new=1` arrived while already on this page (top bar / ⌘K).
    setSyncedOpenNew(openNew);
    if (openNew && canCreate) setSheetOpen(true);
  }
  const [tagTarget, setTagTarget] = useState<{ ids: string[]; clear: () => void } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ ids: string[]; clear: () => void } | null>(null);

  const { columns, facets, csvColumns, mobileCard, allTags } = useClientTable(clients, now);
  const countryCode = org.settings.locale.phoneCountryCode;
  const searchText = useCallback((c: ClientDTO) => clientSearchText(c, countryCode), [countryCode]);

  function onSheetChange(open: boolean) {
    setSheetOpen(open);
    if (!open && openNew) router.replace(status === "archived" ? `${pathname}?status=archived` : pathname, { scroll: false });
  }

  async function setStatus(ids: string[], next: ClientDTO["status"], clear: () => void) {
    const res = await setClientStatusAction({ ids, status: next });
    if (res.ok) {
      toast.success(next === "archived" ? t("clients.bulk.archived") : t("clients.bulk.restored"));
      clear();
    } else toast.error(te(res.error));
  }

  const newButton = canCreate ? (
    <Button onClick={() => setSheetOpen(true)}>
      <PlusIcon />
      {t("clients.newClient")}
    </Button>
  ) : null;

  return (
    <PageContainer>
      <PageHeader title={t("clients.title")} description={t("clients.description")} actions={newButton} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={status}
          onValueChange={(v) => router.push(v === "archived" ? "/clients?status=archived" : "/clients")}
          aria-label={t("clients.columns.status")}
        >
          <SegmentedItem value="active">{t("clients.viewActive")}</SegmentedItem>
          <SegmentedItem value="archived">{t("clients.viewArchived")}</SegmentedItem>
        </Segmented>
        {capped ? <ClientServerSearch /> : null}
      </div>
      {capped ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border bg-muted/40 px-4 py-2.5 text-[14px] text-muted-foreground">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          {t("clients.capNotice", { count: cap.toLocaleString(locale === "ar" ? "ar-AE-u-nu-latn" : "en-US") })}
        </p>
      ) : null}

      {clients.length === 0 ? (
        <div className="rounded-2xl border bg-card shadow-sm">
          {status === "archived" ? (
            <EmptyState icon={ArchiveIcon} title={t("clients.emptyArchived")} description={t("clients.emptyArchivedHint")} />
          ) : (
            <EmptyState icon={UsersIcon} title={t("clients.empty")} description={t("clients.emptyHint")} action={newButton} />
          )}
        </div>
      ) : (
        <DataTable
          data={clients}
          columns={columns}
          getRowId={(c) => c.id}
          searchText={searchText}
          searchPlaceholder={t("clients.searchPlaceholder")}
          facets={facets}
          initialVisibility={CLIENT_HIDDEN_COLUMNS}
          onRowClick={(c) => router.push(`/clients/${c.id}`)}
          mobileCard={mobileCard}
          csv={canExport ? { filename: status === "archived" ? "clients-archived" : "clients", columns: csvColumns } : undefined}
          bulkActions={
            canEdit
              ? (selected, clear) => {
                  const ids = selected.map((c) => c.id);
                  return status === "active" ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setTagTarget({ ids, clear })}>
                        <TagIcon />
                        {t("clients.bulk.addTag")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setArchiveTarget({ ids, clear })}>
                        <ArchiveIcon />
                        {t("clients.bulk.archive")}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setStatus(ids, "active", clear)}>
                      <ArchiveRestoreIcon />
                      {t("clients.bulk.restore")}
                    </Button>
                  );
                }
              : undefined
          }
        />
      )}

      <ClientFormSheet open={sheetOpen} onOpenChange={onSheetChange} client={null} staff={staff} tagSuggestions={allTags} />
      <BulkTagDialog
        open={!!tagTarget}
        onOpenChange={(o) => !o && setTagTarget(null)}
        ids={tagTarget?.ids ?? []}
        suggestions={allTags}
        onDone={() => tagTarget?.clear()}
      />
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title={t("clients.bulk.archiveTitle", { count: archiveTarget?.ids.length ?? 0 })}
        description={t("clients.bulk.archiveBody")}
        confirmLabel={t("clients.bulk.archive")}
        destructive
        onConfirm={async () => {
          if (archiveTarget) await setStatus(archiveTarget.ids, "archived", archiveTarget.clear);
        }}
      />
    </PageContainer>
  );
}
