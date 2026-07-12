/** Modello default: economico, structured output, disponibile ai nuovi account. */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';

/** Fallback se il modello configurato non è più disponibile. */
export const GEMINI_MODEL_FALLBACKS = [
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
] as const;

const DEPRECATED_MODEL_REPLACEMENTS: Record<string, string> = {
  'gemini-2.5-flash': DEFAULT_GEMINI_MODEL,
  'gemini-2.0-flash': DEFAULT_GEMINI_MODEL,
  'gemini-2.0-flash-lite': DEFAULT_GEMINI_MODEL,
};

export function isGeminiModelUnavailableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('no longer available') ||
    lower.includes('not found') ||
    lower.includes('is not supported') ||
    lower.includes('deprecated') ||
    lower.includes('shut down')
  );
}

export function resolveGeminiModelCandidates(requestedModel?: string): string[] {
  const raw = requestedModel?.trim() || DEFAULT_GEMINI_MODEL;
  const mapped = DEPRECATED_MODEL_REPLACEMENTS[raw] ?? raw;

  const ordered = [mapped, ...GEMINI_MODEL_FALLBACKS];
  return [...new Set(ordered)];
}