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
  const trimmed = text.trim().replace(/^\uFEFF/, '');
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}

function normalizeJsonQuotes(payload: string): string {
  return payload
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner: string) => {
      const escaped = inner.replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
}

function stripTrailingCommas(payload: string): string {
  return payload.replace(/,\s*([}\]])/g, '$1');
}

function stripInvalidOptionalKeys(payload: string): string {
  return payload.replace(
    /"(place|description|duration|from|to|body|mode)\?"\s*:/g,
    '"$1":'
  );
}

/** Chiude parentesi mancanti quando la risposta è troncata (max tokens). */
export function closeTruncatedJson(payload: string): string {
  let result = payload.trim();
  const stack: Array<'{' | '['> = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') stack.push(ch);
    if (ch === '}' || ch === ']') stack.pop();
  }

  if (inString) result += '"';
  result = stripTrailingCommas(result);

  while (stack.length > 0) {
    const open = stack.pop();
    result += open === '[' ? ']' : '}';
  }

  return result;
}

export function repairJsonPayload(payload: string): string {
  let repaired = extractJsonPayload(payload);
  repaired = normalizeJsonQuotes(repaired);
  repaired = stripInvalidOptionalKeys(repaired);
  repaired = stripTrailingCommas(repaired);
  repaired = closeTruncatedJson(repaired);
  return repaired;
}

export function parseJsonFromGeminiText<T>(text: string): T {
  const attempts = [
    () => JSON.parse(extractJsonPayload(text)) as T,
    () => JSON.parse(repairJsonPayload(text)) as T,
    () => JSON.parse(closeTruncatedJson(stripTrailingCommas(extractJsonPayload(text)))) as T,
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('JSON non valido');
}