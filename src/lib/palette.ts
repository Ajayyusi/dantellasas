/**
 * Service-category and staff colours from earlier palettes, each paired with
 * its equivalent in the current (A2) palette. Stored colours are read through
 * `currentColor`, so records saved before the redesign match the current look;
 * the next save stores the new value. Colours a business entered themselves
 * pass through unchanged, and so does the premium palette's wine, which the
 * current palette keeps (it is Makeup's colour).
 */
const PREVIOUS_COLORS: Record<string, string> = {
  // "Premium salon" palette (Sep 2026)
  "#965660": "#a8406a",
  "#b07a7f": "#b8527d",
  "#a25c43": "#9a4b34",
  "#b08d57": "#8a5a0b",
  "#507357": "#2f7a55",
  "#4b6d8a": "#3f5f99",
  "#7d5279": "#6a4c96",
  "#715f53": "#5f595c",
  "#4f7b80": "#2e6b73",
  // Original palette
  "#8b3a62": "#a8406a",
  "#b4536e": "#b8527d",
  "#c07a3a": "#9a4b34",
  "#b8962e": "#8a5a0b",
  "#3f7f6d": "#2f7a55",
  "#3e6fa8": "#3f5f99",
  "#6b5bb5": "#6a4c96",
  "#5b6472": "#5f595c",
  "#a33f3f": "#7a323b",
  "#2f8a9a": "#2e6b73",
};

export function currentColor(hex: string): string {
  return PREVIOUS_COLORS[hex.toLowerCase()] ?? hex;
}
