import type { PaymentMethodType } from "@/lib/settings";

/**
 * Pure tender maths for the payment step. Cash may exceed the amount due (the
 * difference is change handed back); every other method must not, because the
 * server rejects payments above the invoice total.
 */

export interface TenderLike {
  key: string;
  methodType: PaymentMethodType;
  amountMinor: number;
}

export interface Settlement {
  tenderedMinor: number;
  /** What is actually recorded as paid (never above the amount due). */
  paidMinor: number;
  remainingMinor: number;
  changeMinor: number;
  /** Non-cash tenders add up to more than is due. */
  overpaid: boolean;
  /** Amount to record per tender key, after taking change out of cash. */
  recorded: Map<string, number>;
}

export function settle(tenders: TenderLike[], dueMinor: number): Settlement {
  const tenderedMinor = tenders.reduce((s, t) => s + Math.max(0, t.amountMinor), 0);
  const recorded = new Map(tenders.map((t) => [t.key, Math.max(0, t.amountMinor)]));
  const over = tenderedMinor - dueMinor;
  if (over <= 0) {
    return { tenderedMinor, paidMinor: tenderedMinor, remainingMinor: dueMinor - tenderedMinor, changeMinor: 0, overpaid: false, recorded };
  }
  const cash = tenders.filter((t) => t.methodType === "cash");
  const cashTotal = cash.reduce((s, t) => s + Math.max(0, t.amountMinor), 0);
  if (cashTotal < over) {
    return { tenderedMinor, paidMinor: tenderedMinor, remainingMinor: 0, changeMinor: 0, overpaid: true, recorded };
  }
  // Take the change out of the cash tenders, last one first.
  let left = over;
  for (const t of [...cash].reverse()) {
    const take = Math.min(left, recorded.get(t.key) ?? 0);
    recorded.set(t.key, (recorded.get(t.key) ?? 0) - take);
    left -= take;
    if (left === 0) break;
  }
  return { tenderedMinor, paidMinor: dueMinor, remainingMinor: 0, changeMinor: over, overpaid: false, recorded };
}

/** Quick cash amounts: exact, then the next round notes above it. */
export function cashSuggestions(dueMinor: number): number[] {
  if (dueMinor <= 0) return [];
  const out = new Set<number>([dueMinor]);
  for (const step of [1000, 5000, 10000, 50000]) {
    const up = Math.ceil(dueMinor / step) * step;
    if (up > dueMinor) out.add(up);
    if (out.size >= 4) break;
  }
  return [...out].sort((a, b) => a - b);
}
