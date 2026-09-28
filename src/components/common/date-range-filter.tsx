"use client";

import { CalendarRangeIcon, Loader2Icon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { useOrg } from "@/components/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RANGE_PRESETS, type DateRange, type RangePreset } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";

/**
 * Date range picker driven by searchParams (`range`, `from`, `to`); the page
 * re-renders on the server with the new range. Other params are preserved.
 */
export function DateRangeFilter({ preset, range }: { preset: RangePreset; range: DateRange }) {
  const { t } = useI18n();
  const org = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [custom, setCustom] = useState(preset === "custom");
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  function navigate(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    startTransition(() => router.push(`${pathname}?${sp.toString()}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={custom ? "custom" : preset}
        onValueChange={(v) => {
          if (v === "custom") {
            setCustom(true);
            return;
          }
          setCustom(false);
          navigate({ range: v, from: null, to: null });
        }}
      >
        <SelectTrigger className="w-auto min-w-40" aria-label={t("common.period")}>
          <CalendarRangeIcon className="text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_PRESETS.map((p) => (
            <SelectItem key={p} value={p}>
              {t(`common.range.${p}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {custom ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to) navigate({ range: "custom", from, to });
          }}
        >
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            aria-label={t("common.from")}
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">–</span>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            aria-label={t("common.to")}
            className="w-40"
          />
          <Button type="submit" variant="outline" disabled={!from || !to}>
            {t("common.apply")}
          </Button>
        </form>
      ) : (
        <span className="text-sm tabular text-muted-foreground">
          {range.from === range.to ? org.dateKey(range.from) : `${org.dateKey(range.from)} – ${org.dateKey(range.to)}`}
        </span>
      )}
      {pending ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label={t("common.loading")} /> : null}
    </div>
  );
}
