"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/lib/actions";
import { useI18n } from "@/lib/i18n/client";

/**
 * Runs a Server Action with pending state, field errors and toasts, so every
 * form behaves the same way on success and failure.
 */
export function useAction<I, R>(
  fn: (input: I) => Promise<ActionResult<R>>,
  opts: { success?: string | false; onSuccess?: (data: R) => void } = {},
) {
  const { t, te } = useI18n();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { success, onSuccess } = opts;

  const run = useCallback(
    async (input: I): Promise<ActionResult<R>> => {
      setPending(true);
      setFieldErrors({});
      try {
        const res = await fn(input);
        if (res.ok) {
          if (success !== false) toast.success(success ?? t("common.changesSaved"));
          onSuccess?.(res.data);
        } else {
          setFieldErrors(res.fieldErrors ?? {});
          toast.error(te(res.error, res.vars));
        }
        return res;
      } catch (err) {
        console.error(err);
        toast.error(t("errors.generic"));
        return { ok: false, error: "errors.generic" };
      } finally {
        setPending(false);
      }
    },
    [fn, success, onSuccess, t, te],
  );

  /** Translated error for a field (errors are translation keys). */
  const errorFor = useCallback(
    (field: string) => (fieldErrors[field] ? te(fieldErrors[field]) : null),
    [fieldErrors, te],
  );

  return { run, pending, fieldErrors, errorFor, setFieldErrors };
}
