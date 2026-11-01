/** True when a LEGAL_* / company field is missing or still a TODO placeholder. */
export function isPlaceholder(value: string | null | undefined): boolean {
  if (value == null) return true;
  const v = value.trim();
  if (!v) return true;
  if (v.startsWith('[')) return true;
  if (/TODO/i.test(v)) return true;
  if (/da definire/i.test(v)) return true;
  return false;
}
