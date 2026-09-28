"use client";

import { useState } from "react";

import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n/client";

import { updateSettingsAction } from "../actions";
import type { SectionValues, SettingsSectionKey, UpdateSettingsInput } from "../schema";

/**
 * Local state for one settings section. The page remounts the form (via
 * `key`) when the saved values change, so `initial` is always the baseline.
 */
export function useSettingsForm<S extends SettingsSectionKey>(section: S, initial: SectionValues<S>) {
  type V = SectionValues<S>;
  const { t } = useI18n();
  // Wrapped in an object so a generic V is never mistaken for an updater function.
  const [state, setState] = useState<{ values: V }>(() => ({ values: initial }));
  const { run, pending, errorFor } = useAction(updateSettingsAction, { success: t("settings.saved") });
  const values = state.values;

  const set = <K extends keyof V>(key: K, value: V[K]) =>
    setState((s) => ({ values: { ...s.values, [key]: value } as V }));
  const setValues = (next: V) => setState({ values: next });

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const save = () => run({ section, values } as UpdateSettingsInput);
  const reset = () => setState({ values: initial });
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void save();
  };

  return { values, setValues, set, dirty, pending, save, reset, onSubmit, errorFor };
}
