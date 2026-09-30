"use client";

import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authErrorKey, requestPasswordReset } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";

export function ForgotPasswordForm() {
  const { t, te } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      const key = authErrorKey(err);
      // Never reveal whether an account exists.
      if (key === "auth.invalidCredentials") setSent(true);
      else setError(te(key));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.03em]">{t("auth.forgotTitle")}</h1>
        <p className="text-[15px] text-muted-foreground">{t("auth.forgotSubtitle")}</p>
      </div>
      {sent ? (
        <div role="status" className="flex gap-3 rounded-lg border bg-card p-4 text-sm">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-success" />
          <p>{t("auth.linkSent", { email })}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Field label={t("auth.email")} htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              dir="ltr"
            />
          </Field>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" size="lg" disabled={pending || !email}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {pending ? t("auth.sending") : t("auth.sendLink")}
          </Button>
        </form>
      )}
      <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">
        {t("auth.backToSignIn")}
      </Link>
    </div>
  );
}
