"use client";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/client";

export interface BirthdayDraft {
  day: string;
  month: string;
  year: string;
}

export function monthName(month: number, locale: string, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { month: style, timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month - 1, 1)),
  );
}

/** Day + month selects with an optional year: most clients share a birthday, not their age. */
export function BirthdayField({
  value,
  onChange,
  error,
}: {
  value: BirthdayDraft;
  onChange: (v: BirthdayDraft) => void;
  error?: string | null;
}) {
  const { t, locale } = useI18n();
  const month = Number(value.month) || 0;
  const year = Number(value.year) || 2000; // leap year keeps 29 Feb available
  const daysInMonth = month ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const set = (patch: Partial<BirthdayDraft>) => {
    const next = { ...value, ...patch };
    const nextMonth = Number(next.month) || 0;
    const max = nextMonth ? new Date(Date.UTC(Number(next.year) || 2000, nextMonth, 0)).getUTCDate() : 31;
    if (Number(next.day) > max) next.day = String(max);
    onChange(next);
  };
  const hasValue = !!(value.day || value.month || value.year);

  return (
    <Field
      label={t("clients.form.birthday")}
      htmlFor="cl-bday-day"
      error={error}
      labelAction={
        hasValue ? (
          <Button type="button" variant="link" size="sm" className="h-auto p-0 text-[13px]" onClick={() => onChange({ day: "", month: "", year: "" })}>
            {t("clients.form.clearBirthday")}
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-[5rem_minmax(0,1fr)_6rem] gap-2">
        <Select value={value.day} onValueChange={(v) => set({ day: v })}>
          <SelectTrigger id="cl-bday-day" aria-label={t("clients.form.day")}>
            <SelectValue placeholder={t("clients.form.day")} />
          </SelectTrigger>
          <SelectContent>
            {days.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={value.month} onValueChange={(v) => set({ month: v })}>
          <SelectTrigger aria-label={t("clients.form.month")}>
            <SelectValue placeholder={t("clients.form.month")} />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>
                {monthName(m, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          inputMode="numeric"
          dir="ltr"
          className="text-start rtl:text-end"
          maxLength={4}
          value={value.year}
          onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          placeholder={t("clients.form.year")}
          aria-label={t("clients.form.yearOptional")}
        />
      </div>
    </Field>
  );
}
