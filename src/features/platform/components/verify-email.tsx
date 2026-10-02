"use client";

import { Loader2Icon, MailCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authErrorKey, sendEmailConfirmation, signOutEverywhere } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n/client";

/**
 * A listed admin whose email isn't verified yet (e.g. a password login):
 * send Firebase's confirmation email, then let the server re-check.
 */
export function VerifyEmail({ email }: { email: string }) {
  const { t, te } = useI18n();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  async function send() {
    setSending(true);
    setMessage(null);
    try {
      const sent = await sendEmailConfirmation("/admin");
      if (sent) setMessage({ tone: "info", text: t("platform.verify.sent", { email }) });
      else {
        setNeedsSignIn(true);
        setMessage({ tone: "error", text: t("platform.verify.sessionGone") });
      }
    } catch (err) {
      setMessage({ tone: "error", text: te(authErrorKey(err)) });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[440px] gap-6 rounded-2xl border bg-card p-6 sm:p-9">
      <div className="grid gap-1.5">
        <span className="mb-1 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
          <MailCheckIcon className="size-5" strokeWidth={1.8} />
        </span>
        <h1 className="font-display text-[26px] font-bold leading-tight">{t("platform.verify.title")}</h1>
        <p className="text-[15px] text-muted-foreground">{t("platform.verify.body", { email })}</p>
      </div>
      {message ? (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={
            message.tone === "error"
              ? "rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive"
              : "rounded-xl bg-muted px-4 py-3 text-sm"
          }
        >
          {message.text}
        </p>
      ) : null}
      <div className="grid gap-2.5">
        {needsSignIn ? (
          <Button
            type="button"
            size="lg"
            onClick={async () => {
              await signOutEverywhere();
              router.replace("/admin/login");
              router.refresh();
            }}
          >
            {t("platform.verify.signInAgain")}
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={send} disabled={sending}>
            {sending ? <Loader2Icon className="animate-spin" /> : null}
            {sending ? t("platform.verify.sending") : t("platform.verify.send")}
          </Button>
        )}
        <Button type="button" variant="outline" size="lg" onClick={() => router.refresh()}>
          {t("platform.verify.continue")}
        </Button>
      </div>
    </div>
  );
}
