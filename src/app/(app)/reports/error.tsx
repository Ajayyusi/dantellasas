"use client";

import { useEffect } from "react";

import { PageContainer } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export default function ReportsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <PageContainer>
      <ErrorState
        title={t("reports.errorTitle")}
        description={t("reports.errorBody")}
        action={<Button onClick={reset}>{t("common.retry")}</Button>}
      />
    </PageContainer>
  );
}
