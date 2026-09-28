/**
 * Translation helpers. Each module declares its messages with
 * `defineMessages({ en, ar })`; the Arabic object must have exactly the same
 * shape as the English one, so a missing translation is a type error.
 */

export type MessageTree = { [key: string]: string | MessageTree };

export type SameShape<T> = {
  [K in keyof T]: T[K] extends string ? string : SameShape<T[K]>;
};

export function defineMessages<T extends MessageTree>(m: { en: T; ar: SameShape<T> }) {
  return m;
}

type Join<K extends string, P extends string> = `${K}.${P}`;

export type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, LeafPaths<T[K]>>;
}[keyof T & string];

export type Vars = Record<string, string | number>;

export function lookup(tree: MessageTree, key: string): string | undefined {
  let node: string | MessageTree | undefined = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in vars ? String(vars[name]) : m,
  );
}

export function createTranslator(tree: MessageTree, locale: string) {
  const plural = new Intl.PluralRules(locale === "ar" ? "ar" : "en");
  function t(key: string, vars?: Vars): string {
    const s = lookup(tree, key);
    if (s === undefined) {
      if (process.env.NODE_ENV !== "production") console.warn(`[i18n] missing key: ${key}`);
      return key;
    }
    return interpolate(s, vars);
  }
  /** Plural lookup: key.zero|one|two|few|many|other, falling back to other. */
  function tp(key: string, count: number, vars?: Vars): string {
    const cat = count === 0 ? "zero" : plural.select(count);
    const s =
      lookup(tree, `${key}.${cat}`) ?? lookup(tree, `${key}.other`) ?? lookup(tree, key) ?? key;
    return interpolate(s, { count, ...vars });
  }
  /** Returns the message if the key exists, otherwise the key itself (for server error codes). */
  function te(key: string, vars?: Vars): string {
    const s = lookup(tree, key);
    return s === undefined ? key : interpolate(s, vars);
  }
  return { t, tp, te };
}
