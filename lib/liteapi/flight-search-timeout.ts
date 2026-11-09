/**
 * Timeout budgets for LiteAPI flight rates search.
 * Kept free of server-only imports so unit tests can import safely.
 */

/** EU/Schengen-ish hubs that usually answer within short LiteAPI timeouts. */
const SHORT_HAUL_DEST_HINT =
  /^(AMS|ATH|BCN|BER|BRU|BUD|CDG|CPH|DUB|DUS|FCO|FRA|GVA|HAM|IST|LGW|LHR|LIS|LTN|LYS|MAD|MAN|MUC|MXP|NAP|NCE|ORY|OSL|OTP|PRG|PSA|RIX|SOF|STN|STR|TIA|TLL|VCE|VIE|VNO|WAW|ZRH)$/i;

/**
 * Long-haul (e.g. MXP→NRT/BKK) often needs ~20–40s; with one timeout retry
 * the UI can approach ~45–60s. Short-haul stays tighter.
 */
export function flightSearchTimeoutMs(destinationIata: string): number {
  const dest = destinationIata.trim().toUpperCase();
  if (!dest) return 12_000;
  if (SHORT_HAUL_DEST_HINT.test(dest)) return 12_000;
  return 28_000;
}

/** Honest UI expectation for search duration (no provider names). */
export function flightSearchExpectationCopyIt(destinationIata?: string | null): string {
  const dest = (destinationIata ?? '').trim().toUpperCase();
  if (dest && !SHORT_HAUL_DEST_HINT.test(dest)) {
    return 'Tratte lunghe: di solito 20–45 secondi. Se serve, riproviamo una volta in automatico.';
  }
  return 'Di solito entro 15 secondi. Se serve, riproviamo una volta in automatico.';
}

export function isLiteApiTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; status?: number; message?: string };
  if (e.status === 504) return true;
  return /timeout/i.test(e.message ?? '');
}
