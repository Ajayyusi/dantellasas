"use client";

import { Loader2Icon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authErrorKey, signInWithGoogle, signOutEverywhere } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";

/** The Google "G", as Google's sign-in button guidelines ask. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-[18px]">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.3 35.3 44 30 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const SILENT = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/user-cancelled"]);

/** Sign-in for the platform admin; `signedInAs` is set when someone else is already signed in. */
export function AdminSignIn({ signedInAs }: { signedInAs: string | null }) {
  const { t, te } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function google() {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (!SILENT.has(code)) setError(te(authErrorKey(err)));
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <span className="mb-1 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
          <ShieldCheckIcon className="size-5" strokeWidth={1.8} />
        </span>
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.03em]">{t("platform.login.title")}</h1>
        <p className="text-[15px] text-muted-foreground">{t("platform.login.subtitle")}</p>
      </div>

      {signedInAs ? (
        <div className="grid gap-3 rounded-xl border bg-muted/40 p-4 text-[14px]">
          <p>{t("platform.login.signedInAs", { email: signedInAs })}</p>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await signOutEverywhere();
              router.refresh();
            }}
          >
            {t("platform.login.switchAccount")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          <Button type="button" variant="outline" size="lg" onClick={google} disabled={pending} className="h-12 text-[15px]">
            {pending ? <Loader2Icon className="animate-spin" /> : <GoogleMark />}
            {t("platform.login.google")}
          </Button>
          {error ? (
            <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <Link href="/login?next=%2Fadmin" className="justify-self-center text-[14px] font-medium text-primary hover:underline">
            {t("platform.login.orEmail")}
          </Link>
        </div>
      )}
    </div>
  );
}
