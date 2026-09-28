"use client";

import { CheckIcon, FileTextIcon, PrinterIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export interface SaleResult {
  id: string;
  number: string;
  totalMinor: number;
  changeMinor: number;
}

export function SuccessPanel({ result, onNewSale }: { result: SaleResult; onNewSale: () => void }) {
  const { t } = useI18n();
  const org = useOrg();
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center" role="status">
      <span className="grid size-14 place-items-center rounded-full bg-success/12 text-success">
        <CheckIcon className="size-7" />
      </span>
      <div>
        <h3 className="text-lg font-semibold">{t("pos.success")}</h3>
        <p className="mt-1 text-sm text-muted-foreground tabular">{t("pos.successBody", { number: result.number, amount: org.money(result.totalMinor) })}</p>
      </div>
      {result.changeMinor > 0 ? (
        <p className="rounded-lg bg-success/10 px-4 py-2 text-base font-semibold text-success tabular">
          {t("pos.changeToGive", { amount: org.money(result.changeMinor) })}
        </p>
      ) : null}
      <div className="grid w-full gap-2 sm:grid-cols-2">
        <Button variant="outline" asChild>
          <a href={`/sales/${result.id}/receipt`} target="_blank" rel="noopener">
            <PrinterIcon />
            {t("pos.printReceipt")}
          </a>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/sales/${result.id}`}>
            <FileTextIcon />
            {t("pos.viewInvoice")}
          </Link>
        </Button>
      </div>
      <Button className="w-full" onClick={onNewSale}>
        <RotateCcwIcon />
        {t("pos.newSale")}
      </Button>
    </div>
  );
}
