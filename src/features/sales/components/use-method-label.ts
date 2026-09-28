"use client";

import { useCallback } from "react";

import { useI18n } from "@/lib/i18n/client";
import type { PaymentMethod } from "@/lib/settings";

const BUILT_IN = ["cash", "card", "bank_transfer", "gift_card", "package"] as const;
type BuiltIn = (typeof BUILT_IN)[number];
const DEFAULTS: Record<BuiltIn, string> = { cash: "Cash", card: "Card", bank_transfer: "Bank transfer", gift_card: "Gift card", package: "Package credit" };

/**
 * Built-in payment methods are stored with English labels; show them in the
 * current language unless the business renamed them.
 */
export function useMethodLabel() {
  const { t } = useI18n();
  return useCallback(
    (m: Pick<PaymentMethod, "id" | "label">) => {
      const id = m.id as BuiltIn;
      if ((BUILT_IN as readonly string[]).includes(id) && m.label === DEFAULTS[id]) return t(`pos.methodNames.${id}`);
      return m.label;
    },
    [t],
  );
}
