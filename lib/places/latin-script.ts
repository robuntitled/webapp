/**
 * True if text uses only Latin script (with accents), numbers, and common punctuation.
 * Used to hide OSM results shown in Cyrillic, Arabic, CJK, etc.
 */
export function isLatinScriptText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return !/[^\p{Script=Latin}\p{Number}\p{Separator}\p{Punctuation}\p{Mark}]/u.test(
    trimmed
  );
}

export function placeUsesLatinScript(label: string, subtitle: string): boolean {
  return isLatinScriptText(label) && isLatinScriptText(subtitle);
}