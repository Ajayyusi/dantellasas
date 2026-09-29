"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authErrorKey, signUpWithEmail } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";

export function SignupForm() {
  const { t, te } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError(t("auth.weakPassword"));
      return;
    }
    setError(null);
    setPending(true);
    try {
      await signUpWithEmail(name, email, password);
      router.replace("/onboarding");
      router.refresh();
    } catch (err) {
      setError(te(authErrorKey(err)));
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 className="font-display text-[34px] font-semibold leading-tight">{t("auth.signUpTitle")}</h1>
        <p className="text-[16px] text-muted-foreground">{t("auth.signUpSubtitle")}</p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label={t("auth.yourName")} htmlFor="name">
          <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
        </Field>
        <Field label={t("auth.email")} htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12"
            dir="ltr"
          />
        </Field>
        <Field label={t("auth.password")} htmlFor="password" hint={t("validation.password")}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
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
        <Button type="submit" size="lg" disabled={pending || !name || !email || !password}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {pending ? t("auth.creatingAccount") : t("auth.createAccount")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t("auth.terms")}</p>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("auth.signInLink")}
        </Link>
      </p>
    </div>
  );
}
