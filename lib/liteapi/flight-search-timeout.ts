/**
 * Timeout budgets for LiteAPI flight rates search.
 * Kept free of server-only imports so unit tests can import safely.
 */

/** EU/Schengen-ish hubs that usually answer within short LiteAPI timeouts. */
const SHORT_HAUL_DEST_HINT =
  /^(AMS|ATH|BCN|BER|BRU|BUD|CDG|CPH|DUB|DUS|FCO|FRA|GVA|HAM|IST|LGW|LHR|LIS|LTN|LYS|MAD|MAN|MUC|MXP|NAP|NCE|ORY|OSL|OTP|PRG|PSA|RIX|SOF|STN|STR|TIA|TLL|VCE|VIE|VNO|WAW|ZRH)$/i;

/**
 * Long-haul (e.g. MXP→BKK) often exceeds the previous 8s short-haul budget —
 * preview evidence: EU routes ~6–8s OK; BKK aborted ~9s with 8s client timeout.
 */
export function flightSearchTimeoutMs(destinationIata: string): number {
  const dest = destinationIata.trim().toUpperCase();
  if (!dest) return 10_000;
  if (SHORT_HAUL_DEST_HINT.test(dest)) return 10_000;
  return 18_000;
}

export function isLiteApiTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; status?: number; message?: string };
  if (e.status === 504) return true;
  return /timeout/i.test(e.message ?? '');
}
