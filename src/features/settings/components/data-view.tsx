"use client";

import { DatabaseIcon, DownloadIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { csvMoney, downloadCsv } from "@/components/data-table/csv";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

import { exportClientsAction, loadDemoDataAction, type ClientExportRow } from "../actions";
import { SectionHeader, SettingsCard } from "./form-parts";

export function DataView({
  demo,
  branchName,
}: {
  demo: "ok" | "owner_only" | "disabled";
  branchName: string;
}) {
  const { t, te } = useI18n();
  const org = useOrg();
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function exportClients() {
    setExporting(true);
    try {
      const res = await exportClientsAction({});
      if (!res.ok) return toast.error(te(res.error));
      downloadCsv<ClientExportRow>(`clients-${new Date().toISOString().slice(0, 10)}`, [
        { header: t("settings.data.columns.firstName"), value: (r) => r.firstName },
        { header: t("settings.data.columns.lastName"), value: (r) => r.lastName },
        { header: t("settings.data.columns.phone"), value: (r) => r.phone },
        { header: t("settings.data.columns.email"), value: (r) => r.email },
        { header: t("settings.data.columns.gender"), value: (r) => r.gender },
        { header: t("settings.data.columns.birthday"), value: (r) => r.birthday },
        { header: t("settings.data.columns.source"), value: (r) => r.source },
        { header: t("settings.data.columns.tags"), value: (r) => r.tags },
        { header: t("settings.data.columns.visits"), value: (r) => r.visits },
        { header: `${t("settings.data.columns.totalSpend")} (${org.currency})`, value: (r) => csvMoney(r.totalSpendMinor) },
        { header: t("settings.data.columns.lastVisit"), value: (r) => (r.lastVisitAt ? org.date(r.lastVisitAt, "date") : "") },
        { header: t("settings.data.columns.status"), value: (r) => r.status },
        { header: t("settings.data.columns.createdAt"), value: (r) => (r.createdAt ? org.date(r.createdAt, "date") : "") },
      ], res.data);
      toast.success(t("settings.data.exported", { count: res.data.length }));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <SectionHeader title={t("settings.sections.data.title")} description={t("settings.sections.data.description")} />
      <SettingsCard title={t("settings.data.demo")} description={t("settings.data.demoHint")}>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={demo !== "ok"} onClick={() => setConfirmDemo(true)}>
            <SparklesIcon />
            {t("settings.data.demoButton")}
          </Button>
          {demo !== "ok" ? (
            <span className="text-[14px] text-muted-foreground">
              {demo === "owner_only" ? t("settings.data.demoOwnerOnly") : t("settings.data.demoDisabled")}
            </span>
          ) : null}
        </div>
      </SettingsCard>
      <SettingsCard title={t("settings.data.export")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <DatabaseIcon className="size-4" />
            </div>
            <div className="grid gap-0.5">
              <span className="text-sm font-medium">{t("settings.data.exportClients")}</span>
              <span className="text-[14px] text-muted-foreground">{t("settings.data.exportClientsHint")}</span>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={exportClients} disabled={exporting}>
            {exporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
            {t("common.export")}
          </Button>
        </div>
      </SettingsCard>
      <ConfirmDialog
        open={confirmDemo}
        onOpenChange={setConfirmDemo}
        title={t("settings.data.demoConfirmTitle", { branch: branchName })}
        description={t("settings.data.demoConfirmBody")}
        confirmLabel={t("settings.data.demoButton")}
        onConfirm={async () => {
          const res = await loadDemoDataAction({});
          if (res.ok) toast.success(t("settings.data.demoLoaded"));
          else toast.error(te(res.error));
        }}
      />
    </div>
  );
}
