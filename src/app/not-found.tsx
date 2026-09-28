import { CompassIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <EmptyState
        icon={CompassIcon}
        title={t("shell.notFoundTitle")}
        description={t("shell.notFoundBody")}
        action={
          <Button asChild variant="outline">
            <Link href="/">{t("shell.goHome")}</Link>
          </Button>
        }
      />
    </div>
  );
}
