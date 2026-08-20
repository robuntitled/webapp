export function selectSearchOrigins(
  origins: string[],
  opts?: { maxOrigins?: number }
): string[] {
  const cap = Math.max(1, Math.min(5, opts?.maxOrigins ?? 2));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of origins) {
    const code = raw.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code) || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
    if (out.length >= cap) break;
  }
  return out;
}
