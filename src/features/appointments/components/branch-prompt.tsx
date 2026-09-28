"use client";

import { MapPinIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { EmptyState } from "@/components/common/states";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { setBranchAction } from "@/lib/tenancy/actions";

export function BranchPrompt() {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="rounded-xl border bg-card">
      <EmptyState
        icon={MapPinIcon}
        title={t("appointments.chooseBranchTitle")}
        description={t("appointments.chooseBranchBody")}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {org.branches.map((b) => (
              <Button
                key={b.id}
                variant="outline"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await setBranchAction(b.id);
                    if (res.ok) router.refresh();
                  })
                }
              >
                {b.name}
              </Button>
            ))}
          </div>
        }
      />
    </div>
  );
}
