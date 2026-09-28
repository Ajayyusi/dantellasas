import type { TKey } from "@/lib/i18n/messages";
import { DEFAULT_SETTINGS, type PaymentMethod } from "@/lib/settings";

const TRANSLATED: Record<string, TKey> = {
  cash: "expenses.methods.cash",
  card: "expenses.methods.card",
  bank_transfer: "expenses.methods.bank_transfer",
};

/** Methods that make sense for paying a supplier or a bill. */
export function expenseMethods(methods: PaymentMethod[]): PaymentMethod[] {
  return methods.filter((m) => m.enabled && m.type !== "gift_card" && m.type !== "package");
}

/**
 * Label for a payment method id. Built-in methods whose label was never
 * customised are translated; custom labels are shown as typed.
 */
export function paymentMethodLabel(methods: PaymentMethod[], id: string, t: (key: TKey) => string): string {
  if (!id) return "—";
  const m = methods.find((x) => x.id === id);
  const builtIn = DEFAULT_SETTINGS.payments.methods.find((x) => x.id === id);
  const key = TRANSLATED[id];
  if (key && (!m || m.label === builtIn?.label)) return t(key);
  return m?.label ?? id;
}
