"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { authErrorKey, signInWithEmail } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function LoginForm() {
  const { t, te } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("reason") === "suspended" ? t("auth.suspended") : null,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signInWithEmail(email, password);
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      setError(te(authErrorKey(err)));
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="font-display text-[34px] font-semibold leading-tight">{t("auth.signInTitle")}</h1>
        <p className="text-[16px] text-muted-foreground">{t("auth.signInSubtitle")}</p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label={t("auth.email")} htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
            dir="ltr"
          />
        </Field>
        <Field
          label={t("auth.password")}
          htmlFor="password"
          labelAction={
            <Link href="/forgot-password" className="text-[14px] font-medium text-primary hover:underline">
              {t("auth.forgotPassword")}
            </Link>
          }
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12"
          />
        </Field>
        {error ? (
          <p role="alert" className="animate-fade-up rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={pending || !email || !password}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {pending ? t("auth.signingIn") : t("auth.signIn")}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.noAccount", { app: brand.name })}{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          {t("auth.createAccount")}
        </Link>
      </p>
    </div>
  );
}
