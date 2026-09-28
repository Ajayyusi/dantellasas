/** Picks the Arabic name when the UI is Arabic and one exists. */
export function localName(item: { name: string; nameAr?: string }, locale: string): string {
  return locale === "ar" && item.nameAr ? item.nameAr : item.name;
}
