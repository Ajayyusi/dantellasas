import { RANGE_PRESETS, rangeForPreset, type DateRange, type RangePreset } from "@/lib/dates";

export type SearchParams = Record<string, string | string[] | undefined>;

export function param(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Reads `range` / `from` / `to` searchParams into a preset and a dateKey range. */
export function rangeFromParams(
  sp: SearchParams,
  tz: string,
  weekStartsOn: number,
  fallback: RangePreset = "this_month",
): { preset: RangePreset; range: DateRange } {
  const raw = param(sp, "range");
  const preset = (RANGE_PRESETS as readonly string[]).includes(raw ?? "") ? (raw as RangePreset) : fallback;
  const range = rangeForPreset(preset, tz, weekStartsOn, { from: param(sp, "from"), to: param(sp, "to") });
  return { preset, range };
}
