import { ShieldOffIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

/** 403 for anyone signed in who isn't a platform admin. */
export default async function AdminForbidden() {
  const { t } = await getI18n();
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4">
      <EmptyState
        icon={ShieldOffIcon}
        title={t("platform.forbidden.title")}
        description={t("platform.forbidden.body")}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/dashboard">{t("platform.openApp")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/login">{t("platform.login.switchAccount")}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
