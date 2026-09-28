"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";

import { updateDisplayNameAction } from "../actions";

export function ProfileCard({ displayName, email, roleName }: { displayName: string; email: string; roleName: string }) {
  const { t } = useI18n();
  const [name, setName] = useState(displayName);
  const { run, pending, errorFor } = useAction(updateDisplayNameAction, { success: t("account.saved") });
  const dirty = name.trim() !== displayName && name.trim().length > 0;
  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run({ displayName: name });
        }}
      >
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>{t("account.profile")}</CardTitle>
            <CardDescription>{t("account.profileHint")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label={t("account.displayName")} htmlFor="acc-name" required error={errorFor("displayName")}>
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
          <Field label={t("common.email")} htmlFor="acc-email" hint={t("account.emailHint")}>
            <Input id="acc-email" value={email} readOnly disabled dir="ltr" className="text-start" />
          </Field>
          <Field label={t("account.role")} htmlFor="acc-role">
            <Input id="acc-role" value={roleName} readOnly disabled />
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {t("common.saveChanges")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
