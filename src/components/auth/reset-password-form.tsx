"use client";

import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authErrorKey, checkResetCode, resetPassword } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";

type Phase = "checking" | "ready" | "invalid" | "done";

export function ResetPasswordForm({ code }: { code: string | null }) {
  const { t, te } = useI18n();
  const [phase, setPhase] = useState<Phase>(code ? "checking" : "invalid");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!code) return;
    let active = true;
    checkResetCode(code)
      .then((addr) => {
        if (!active) return;
        setEmail(addr);
        setPhase("ready");
      })
      .catch(() => active && setPhase("invalid"));
    return () => {
      active = false;
    };
  }, [code]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError(t("validation.password"));
    if (password !== confirm) return setError(t("validation.passwordMatch"));
    setPending(true);
    setError(null);
    try {
      await resetPassword(code!, password);
      setPhase("done");
    } catch (err) {
      setError(te(authErrorKey(err)));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.03em]">{t("auth.resetTitle")}</h1>
        <p className="text-[15px] text-muted-foreground">{email || t("auth.resetSubtitle")}</p>
      </div>
      {phase === "checking" ? (
        <div className="grid gap-3">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : phase === "invalid" ? (
        <div className="grid gap-4">
          <p role="alert" className="animate-fade-up rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive">
            {t("auth.invalidLink")}
          </p>
          <Button asChild variant="outline">
            <Link href="/forgot-password">{t("auth.sendLink")}</Link>
          </Button>
        </div>
      ) : phase === "done" ? (
        <div className="grid gap-4">
          <div role="status" className="flex gap-3 rounded-lg border bg-card p-4 text-sm">
            <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-success" />
            <p>{t("auth.passwordUpdated")}</p>
          </div>
          <Button asChild size="lg">
            <Link href="/login">{t("auth.signIn")}</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Field label={t("auth.newPassword")} htmlFor="password">
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
          </Field>
          <Field label={t("auth.confirmPassword")} htmlFor="confirm">
            <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" />
          </Field>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {pending ? t("auth.updating") : t("auth.updatePassword")}
          </Button>
        </form>
      )}
    </div>
  );
}
