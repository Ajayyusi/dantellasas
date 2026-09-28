/**
 * Money is stored as integer minor units (fils for AED): 15000 = AED 150.00.
 * Rates are basis points: 500 = 5%. Nothing here uses floating-point money
 * except at the input/format boundary.
 */

export const MINOR_PER_MAJOR = 100;

export function toMinor(major: number | string): number {
  const n = typeof major === "string" ? Number(major.replace(/[^\d.-]/g, "")) : major;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * MINOR_PER_MAJOR);
}

export function fromMinor(minor: number): number {
  return minor / MINOR_PER_MAJOR;
}

/** "150.00" style string for form inputs. */
export function minorToInput(minor: number): string {
  return (minor / MINOR_PER_MAJOR).toFixed(2);
}

const formatterCache = new Map<string, Intl.NumberFormat>();

export function numberLocale(locale: string): string {
  // Western digits in Arabic UI, as is usual in the UAE.
  return locale === "ar" ? "ar-AE-u-nu-latn" : "en-AE";
}

export function formatMoney(
  minor: number,
  currency = "AED",
  locale = "en",
  opts: { compact?: boolean; hideZeroDecimals?: boolean } = {},
): string {
  const key = `${locale}|${currency}|${opts.compact ? 1 : 0}|${opts.hideZeroDecimals ? 1 : 0}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(numberLocale(locale), {
      style: "currency",
      currency,
      currencyDisplay: "code",
      notation: opts.compact ? "compact" : "standard",
      minimumFractionDigits: opts.compact || opts.hideZeroDecimals ? 0 : 2,
      maximumFractionDigits: opts.compact ? 1 : 2,
    });
    formatterCache.set(key, f);
  }
  return f.format(minor / MINOR_PER_MAJOR);
}

export function formatNumber(n: number, locale = "en", maxFractionDigits = 0): string {
  return new Intl.NumberFormat(numberLocale(locale), {
    maximumFractionDigits: maxFractionDigits,
  }).format(n);
}

export function formatPercent(ratio: number, locale = "en", digits = 0): string {
  return new Intl.NumberFormat(numberLocale(locale), {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(ratio);
}

export function percentOf(minor: number, bps: number): number {
  return Math.round((minor * bps) / 10000);
}

// ── Tax ────────────────────────────────────────────────────────────────

export interface TaxSplit {
  /** Amount excluding tax */
  netMinor: number;
  taxMinor: number;
  /** Amount the client pays for this line */
  grossMinor: number;
}

/**
 * Splits an amount into net + tax. With inclusive pricing `amountMinor` is the
 * gross price (UAE norm); otherwise it is the net price and tax is added.
 */
export function splitTax(amountMinor: number, rateBps: number, inclusive: boolean): TaxSplit {
  if (rateBps <= 0 || amountMinor === 0) {
    return { netMinor: amountMinor, taxMinor: 0, grossMinor: amountMinor };
  }
  if (inclusive) {
    const taxMinor = Math.round((amountMinor * rateBps) / (10000 + rateBps));
    return { netMinor: amountMinor - taxMinor, taxMinor, grossMinor: amountMinor };
  }
  const taxMinor = Math.round((amountMinor * rateBps) / 10000);
  return { netMinor: amountMinor, taxMinor, grossMinor: amountMinor + taxMinor };
}

export interface TicketLineInput {
  unitPriceMinor: number;
  quantity: number;
  discountMinor?: number;
  taxRateBps: number;
}

export interface TicketLineResult {
  /** unit × qty before any discount */
  baseMinor: number;
  /** line discount + its share of the order discount */
  discountMinor: number;
  orderDiscountShareMinor: number;
  netMinor: number;
  taxMinor: number;
  totalMinor: number;
}

export interface TicketResult {
  lines: TicketLineResult[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
}

/**
 * Computes a ticket. The order-level discount is spread across lines in
 * proportion to their discounted value so VAT is exact per line; the last
 * line absorbs rounding so shares always sum to the order discount.
 */
export function computeTicket(
  lines: TicketLineInput[],
  orderDiscountMinor: number,
  pricesIncludeTax: boolean,
): TicketResult {
  const afterLine = lines.map((l) => {
    const base = Math.max(0, Math.round(l.unitPriceMinor * l.quantity));
    const lineDiscount = Math.min(base, Math.max(0, l.discountMinor ?? 0));
    return { base, lineDiscount, value: base - lineDiscount };
  });
  const pool = afterLine.reduce((s, l) => s + l.value, 0);
  const orderDiscount = Math.min(pool, Math.max(0, orderDiscountMinor));

  let allocated = 0;
  const lastIdx = afterLine.reduce((idx, l, i) => (l.value > 0 ? i : idx), -1);
  const results: TicketLineResult[] = afterLine.map((l, i) => {
    let share = 0;
    if (orderDiscount > 0 && pool > 0 && l.value > 0) {
      share =
        i === lastIdx ? orderDiscount - allocated : Math.floor((orderDiscount * l.value) / pool);
      allocated += share;
    }
    const amount = l.value - share;
    const tax = splitTax(amount, lines[i]?.taxRateBps ?? 0, pricesIncludeTax);
    return {
      baseMinor: l.base,
      discountMinor: l.lineDiscount + share,
      orderDiscountShareMinor: share,
      netMinor: tax.netMinor,
      taxMinor: tax.taxMinor,
      totalMinor: tax.grossMinor,
    };
  });

  return {
    lines: results,
    subtotalMinor: results.reduce((s, l) => s + l.baseMinor, 0),
    discountMinor: results.reduce((s, l) => s + l.discountMinor, 0),
    taxMinor: results.reduce((s, l) => s + l.taxMinor, 0),
    totalMinor: results.reduce((s, l) => s + l.totalMinor, 0),
  };
}
