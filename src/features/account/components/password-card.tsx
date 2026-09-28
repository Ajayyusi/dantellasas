"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";

import { changePassword, passwordErrorKey } from "../password";
import { passwordInput } from "../schema";

const EMPTY = { current: "", next: "", confirm: "" };

export function PasswordCard({ email }: { email: string }) {
  const { t, te } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const parsed = passwordInput.safeParse(form);
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
      setErrors(out);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await changePassword(email, form.current, form.next);
      setForm(EMPTY);
      toast.success(t("account.passwordChanged"));
    } catch (err) {
      const key = passwordErrorKey(err);
      if (key === "auth.invalidCredentials") setErrors({ current: "account.errors.wrongPassword" });
      else if (key === "auth.weakPassword") setErrors({ next: key });
      toast.error(te(key === "auth.invalidCredentials" ? "account.errors.wrongPassword" : key));
    } finally {
      setPending(false);
    }
  }

  const err = (k: string) => (errors[k] ? te(errors[k]!) : null);

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>{t("account.changePassword")}</CardTitle>
            <CardDescription>{t("account.changePasswordHint")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <Field label={t("account.currentPassword")} htmlFor="pw-current" required error={err("current")}>
            <Input id="pw-current" type="password" autoComplete="current-password" value={form.current} onChange={(e) => set("current", e.target.value)} />
          </Field>
          <Field label={t("account.newPassword")} htmlFor="pw-next" required hint={t("validation.password")} error={err("next")}>
            <Input id="pw-next" type="password" autoComplete="new-password" value={form.next} onChange={(e) => set("next", e.target.value)} />
          </Field>
          <Field label={t("account.confirmPassword")} htmlFor="pw-confirm" required error={err("confirm")}>
            <Input id="pw-confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending || !form.current || !form.next}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {t("account.updatePassword")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
