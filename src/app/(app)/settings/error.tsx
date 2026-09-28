"use client";

import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export default function SettingsError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border bg-card">
      <ErrorState
        title={t("shell.errorTitle")}
        description={t("shell.errorBody")}
        action={
          <Button variant="outline" onClick={reset}>
            {t("common.retry")}
          </Button>
        }
      />
    </div>
  );
}
