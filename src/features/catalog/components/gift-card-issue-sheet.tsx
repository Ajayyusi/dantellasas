"use client";

import { InfoIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { MoneyInput } from "@/components/common/money-input";
import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FormSection } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { todayKey } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";

import { issueGiftCardAction } from "../gift-card-actions";
import { addMonths } from "../periods";
import { ClientPicker, type PickedClient } from "./client-picker";

const AMOUNTS = [10000, 25000, 50000, 100000];

function defaultExpiry(tz: string): string {
  const today = todayKey(tz);
  return addMonths(new Date(`${today}T12:00:00Z`), 12)
    .toISOString()
    .slice(0, 10);
}

export function GiftCardIssueSheet({
  open,
  onOpenChange,
  onIssued,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? <IssueForm onOpenChange={onOpenChange} onIssued={onIssued} /> : null}
    </Sheet>
  );
}

function IssueForm({ onOpenChange, onIssued }: { onOpenChange: (open: boolean) => void; onIssued: (id: string) => void }) {
  const { t } = useI18n();
  const org = useOrg();
  const [amountMinor, setAmount] = useState(0);
  const [expires, setExpires] = useState(() => defaultExpiry(org.timezone));
  const [noExpiry, setNoExpiry] = useState(false);
  const [purchaser, setPurchaser] = useState<PickedClient | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const { run, pending, errorFor } = useAction(issueGiftCardAction, {
    success: false,
    onSuccess: (data) => {
      toast.success(t("catalog.giftCards.issuedToast", { code: data.code }));
      onOpenChange(false);
      onIssued(data.id);
    },
  });
  const minDate = todayKey(org.timezone);

  return (
    <SheetContent className="sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>{t("catalog.giftCards.issue")}</SheetTitle>
        <SheetDescription>{t("catalog.giftCards.issueHint")}</SheetDescription>
      </SheetHeader>
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          void run({
            amountMinor,
            expiresOn: noExpiry ? null : expires || null,
            purchaserClientId: purchaser?.id ?? null,
            purchaserName: purchaser?.name ?? "",
            recipientName: recipientName.trim(),
            recipientEmail: recipientEmail.trim(),
            message: message.trim(),
          });
        }}
      >
        <SheetBody className="grid gap-6">
          <FormSection title={t("catalog.giftCards.value")}>
            <Field label={t("common.amount")} htmlFor="gc-amount" required error={errorFor("amountMinor")}>
              <MoneyInput
                id="gc-amount"
                value={amountMinor}
                onChange={setAmount}
                currency={org.currency}
                invalid={!!errorFor("amountMinor")}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {AMOUNTS.map((a) => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  variant={a === amountMinor ? "default" : "outline"}
                  onClick={() => setAmount(a)}
                >
                  {org.money(a, { compact: true })}
                </Button>
              ))}
            </div>
            <FieldGroup>
              <Field
                label={t("catalog.giftCards.expiresOn")}
                htmlFor="gc-expires"
                hint={noExpiry ? undefined : t("catalog.giftCards.expiryHint")}
                error={errorFor("expiresOn")}
              >
                <Input
                  id="gc-expires"
                  type="date"
                  min={minDate}
                  value={noExpiry ? "" : expires}
                  disabled={noExpiry}
                  onChange={(e) => setExpires(e.target.value)}
                />
              </Field>
              <label className="flex items-center gap-3 self-start text-sm sm:pt-7">
                <Switch checked={noExpiry} onCheckedChange={setNoExpiry} />
                {t("catalog.giftCards.noExpiry")}
              </label>
            </FieldGroup>
          </FormSection>

          <Separator />

          <FormSection title={t("catalog.giftCards.people")}>
            <Field
              label={t("catalog.giftCards.purchaser")}
              htmlFor="gc-purchaser"
              hint={t("catalog.giftCards.purchaserHint")}
              optionalLabel={t("common.optional")}
            >
              <ClientPicker id="gc-purchaser" value={purchaser} onChange={setPurchaser} />
            </Field>
            <FieldGroup>
              <Field
                label={t("catalog.giftCards.recipientName")}
                htmlFor="gc-rname"
                optionalLabel={t("common.optional")}
                error={errorFor("recipientName")}
              >
                <Input id="gc-rname" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              </Field>
              <Field
                label={t("catalog.giftCards.recipientEmail")}
                htmlFor="gc-remail"
                optionalLabel={t("common.optional")}
                error={errorFor("recipientEmail")}
              >
                <Input
                  id="gc-remail"
                  type="email"
                  dir="ltr"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  aria-invalid={!!errorFor("recipientEmail")}
                />
              </Field>
            </FieldGroup>
            <Field
              label={t("catalog.giftCards.message")}
              htmlFor="gc-message"
              optionalLabel={t("common.optional")}
              error={errorFor("message")}
            >
              <Textarea
                id="gc-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("catalog.giftCards.messagePlaceholder")}
              />
            </Field>
          </FormSection>

          <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-[13px] text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            {t("catalog.giftCards.soldAtCheckout")}
          </p>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending || amountMinor <= 0}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {t("catalog.giftCards.issueCta", { amount: org.money(amountMinor) })}
          </Button>
        </SheetFooter>
      </form>
    </SheetContent>
  );
}
