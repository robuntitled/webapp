const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedTripLink =
  | { kind: 'partenza'; id: string }
  | { kind: 'invito'; token: string }
  | { kind: 'pratica'; id: string }
  | { kind: 'edizione'; id: string }
  | { kind: 'invalid'; reason: 'empty' | 'unrecognized' };

function stripUrl(input: string): string {
  return input.trim();
}

function pathFromInput(raw: string): string {
  const trimmed = stripUrl(raw);
  if (!trimmed) return '';
  try {
    const url = trimmed.includes('://')
      ? new URL(trimmed)
      : new URL(trimmed, 'https://bradigo.local');
    return `${url.pathname}${url.search}`;
  } catch {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
}

export function parseTripShareLink(input: string): ParsedTripLink {
  const trimmed = stripUrl(input);
  if (!trimmed) return { kind: 'invalid', reason: 'empty' };

  if (UUID_RE.test(trimmed)) {
    return { kind: 'partenza', id: trimmed };
  }

  const path = pathFromInput(trimmed).split('?')[0] ?? '';
  const parts = path.split('/').filter(Boolean);

  const partenzeIdx = parts.indexOf('partenze');
  if (partenzeIdx >= 0 && parts[partenzeIdx + 1]) {
    return { kind: 'partenza', id: parts[partenzeIdx + 1] };
  }

  const invitoIdx = parts.indexOf('invito');
  if (invitoIdx >= 0 && parts[invitoIdx + 1]) {
    return { kind: 'invito', token: parts[invitoIdx + 1] };
  }

  const praticaIdx = parts.indexOf('pratica');
  if (praticaIdx >= 0 && parts[praticaIdx + 1]) {
    return { kind: 'pratica', id: parts[praticaIdx + 1] };
  }

  const edizioneIdx = parts.indexOf('edizione');
  if (edizioneIdx >= 0 && parts[edizioneIdx + 1]) {
    return { kind: 'edizione', id: parts[edizioneIdx + 1] };
  }

  return { kind: 'invalid', reason: 'unrecognized' };
}

export const TRIP_LINK_ERRORS = {
  empty: 'Incolla il link del viaggio per continuare.',
  unrecognized: 'Questo non sembra un link di viaggio Bradigo.',
  missing: 'Non abbiamo trovato questo viaggio. Controlla il link e riprova.',
  unavailable: 'Questo viaggio non è più disponibile.',
} as const;
