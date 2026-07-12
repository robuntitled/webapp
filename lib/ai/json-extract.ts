type GeminiContentPart = {
  text?: string;
  thought?: boolean;
};

/** Estrae il testo risposta ignorando eventuali parti "thinking". */
export function pickGeminiAnswerText(parts: GeminiContentPart[] | undefined): string {
  if (!parts?.length) return '';

  const withText = parts.filter((p) => typeof p.text === 'string' && p.text.trim().length > 0);
  const nonThought = withText.filter((p) => !p.thought);

  const candidates = nonThought.length > 0 ? nonThought : withText;

  for (let i = candidates.length - 1; i >= 0; i--) {
    const text = candidates[i].text!.trim();
    if (text.includes('{')) return text;
  }

  return candidates[candidates.length - 1]?.text?.trim() ?? '';
}

/** Estrae un oggetto JSON da testo grezzo (fences markdown, testo extra). */
export function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

export function parseJsonFromGeminiText<T>(text: string): T {
  const payload = extractJsonPayload(text);
  return JSON.parse(payload) as T;
}