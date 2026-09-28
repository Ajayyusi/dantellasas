/**
 * Search tokens for Firestore `array-contains` lookups (no full-text search in
 * Firestore). See docs/firestore-schema.md § Search.
 */

export function normalizePhone(raw: string, defaultCountryCode = "971"): string {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = defaultCountryCode + digits.slice(1);
  else if (digits.length <= 9) digits = defaultCountryCode + digits;
  return digits;
}

export function normalizeText(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٰٟ]/g, "") // Arabic diacritics
    .toLowerCase()
    .trim();
}

function prefixes(word: string, min = 2, max = 15): string[] {
  const out: string[] = [];
  for (let i = min; i <= Math.min(word.length, max); i++) out.push(word.slice(0, i));
  return out;
}

export function buildSearchTokens(input: {
  names: (string | undefined | null)[];
  phone?: string | null;
  email?: string | null;
  extra?: (string | undefined | null)[];
}): string[] {
  const tokens = new Set<string>();
  const words = input.names
    .filter((n): n is string => !!n)
    .flatMap((n) => normalizeText(n).split(/[\s\-']+/))
    .filter(Boolean);
  for (const w of words) prefixes(w).forEach((p) => tokens.add(p));
  const full = normalizeText(input.names.filter(Boolean).join(" "));
  if (full) prefixes(full.replace(/\s+/g, " "), 3, 30).forEach((p) => tokens.add(p));

  if (input.phone) {
    const digits = input.phone.replace(/\D/g, "");
    if (digits) {
      tokens.add(digits);
      // local form (05x…) and trailing digits for partial lookups
      if (digits.startsWith("971")) tokens.add("0" + digits.slice(3));
      for (let n = 4; n <= Math.min(9, digits.length); n++) tokens.add(digits.slice(-n));
    }
  }
  if (input.email) {
    const e = input.email.toLowerCase().trim();
    tokens.add(e);
    const local = e.split("@")[0];
    if (local) prefixes(local, 3, 20).forEach((p) => tokens.add(p));
  }
  for (const x of input.extra ?? []) {
    if (x) tokens.add(normalizeText(x));
  }
  return [...tokens].slice(0, 200);
}

/** Normalises what the user typed into the single token we query for. */
export function searchTermToken(term: string): string {
  const t = term.trim();
  const digits = t.replace(/[\s+\-()]/g, "");
  if (/^\d{4,}$/.test(digits)) {
    if (digits.startsWith("00")) return digits.slice(2);
    return digits;
  }
  return normalizeText(t).replace(/\s+/g, " ").slice(0, 30);
}
