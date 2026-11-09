/**
 * Detect missing relation/column errors from Postgres and PostgREST/Supabase.
 * PostgREST often returns PGRST204 + "schema cache" instead of 42703.
 */

export function isMissingSchemaError(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  const code = (error.code ?? '').toUpperCase();
  if (code === '42P01' || code === '42703' || code === 'PGRST204') return true;
  const msg = error.message ?? '';
  if (/schema cache/i.test(msg)) return true;
  if (/Could not find the ['"]?\w+['"]? column/i.test(msg)) return true;
  if (/column .+ does not exist/i.test(msg)) return true;
  if (/relation .+ does not exist/i.test(msg)) return true;
  return false;
}

/** Never show raw DB/PostgREST messages to end users. */
export function friendlyDbErrorIt(
  error: { code?: string; message?: string } | null | undefined,
  fallback = 'Operazione non riuscita. Riprova tra poco.'
): string {
  if (!error?.message) return fallback;
  if (isMissingSchemaError(error)) {
    return 'Non siamo riusciti a salvare il viaggio. Riprova tra poco.';
  }
  // Strip technical noise; keep short Italian if already friendly
  if (/^[A-Za-z].*[a-z]{3,}/.test(error.message) && /column|schema|PGRST|SQL|permission/i.test(error.message)) {
    return fallback;
  }
  if (error.message.length > 120 || /[{}\[\]]/.test(error.message)) {
    return fallback;
  }
  // Allow known Italian product errors through
  if (/[àèéìòù]/i.test(error.message) || /impossibile|scegli|template|viaggio/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}
