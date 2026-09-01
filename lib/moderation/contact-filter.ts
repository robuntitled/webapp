import { deobfuscateForContact } from '@/lib/moderation/deobfuscate';

/** Domini propri ammessi (link Flygetr ok). */
const ALLOWED_HOST_SNIPPETS = [
  'nomadlink',
  'bradigo',
  'flygetr',
  'webapp-bice-six-42.vercel.app',
];

const EMAIL_RE =
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** Varianti offuscate: at/chiocciola/arroba + dot/punto */
const OBFUSCATED_EMAIL_RE =
  /[a-z0-9._%+-]+\s*(?:@|\[at\]|\(at\)|\sat\s|chiocciola|arroba)\s*[a-z0-9.-]+\s*(?:\.|\[dot\]|\(dot\)|\sdot\s|\spunto\s|\spoint\s)\s*[a-z]{2,}/i;

const URL_RE =
  /(?:https?:\/\/|hxxps?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|it|net|org|io|app|info|co|eu|me|dev|ai|xyz|online|site|travel)(?:\/[^\s<>"']*)?/i;

/** "punto com" / "dot com" senza @ (link parlato) */
const SPOKEN_URL_RE =
  /\b[a-z0-9-]{2,}\s*(?:punto|dot|point)\s*(?:com|it|net|org|io|app|info)\b/i;

const SHORT_LINK_RE =
  /\b(?:wa\.me|t\.me|bit\.ly|tinyurl\.com|goo\.gl|rb\.gy|cutt\.ly|is\.gd|ow\.ly)\/[\w/-]+/i;

const OFF_PLATFORM_RE =
  /\b(?:whatsapp|whats\s*app|whtsapp|wa\b|telegram|tg\b|wickr|signal\s*app|line\s*app)\b/i;

function isAllowedUrl(match: string): boolean {
  const lower = match.toLowerCase();
  return ALLOWED_HOST_SNIPPETS.some((s) => lower.includes(s));
}

function looksLikeItalianMobile(digits: string): boolean {
  // 10 cifre che iniziano con 3, oppure 12 con 39…
  if (/^3\d{9}$/.test(digits)) return true;
  if (/^39\d{9,10}$/.test(digits)) return true;
  if (/^\d{10,15}$/.test(digits) && digits.startsWith('3')) return true;
  return false;
}

function hasPhoneNumber(text: string, digitRuns: string): boolean {
  // Prefisso internazionale esplicito
  if (/(?:\+|00)\s*\d{1,3}[\s./()-]*(?:\d[\s./()-]*){7,14}\d/.test(text)) {
    return true;
  }

  // Cellulare IT classico / spaziato: 3 3 3 1 2 3 4 5 6 7
  if (/(?<!\d)3(?:[\s./()-]*\d){9}(?!\d)/.test(text)) {
    return true;
  }

  const compact = text.replace(/[\s./()-]/g, '');
  if (/(?<!\d)(?:\+?39)?3\d{9}(?!\d)/.test(compact)) {
    return true;
  }

  // Cifre da parole ("tre nove…") o estratte
  for (const run of digitRuns.split(/\s+/)) {
    if (run.length >= 8 && looksLikeItalianMobile(run)) return true;
    if (run.length >= 10 && run.length <= 15) return true;
  }

  return false;
}

function hasSpelledPhoneSequence(text: string): boolean {
  // ≥8 parole-cifra consecutive (IT/EN) → quasi certamente un numero
  const digitWord =
    '(?:zero|uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|one|two|three|four|five|six|seven|eight|nine|oh|nought|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|un|deux|trois|quatre|cinq|sept|huit|neuf|eins|zwei|drei|vier|funf|fünf|sechs|acht|neun|\\d)';
  const re = new RegExp(
    `\\b(?:${digitWord}\\b[\\s,._/-]*){8,}`,
    'i'
  );
  return re.test(text);
}

export type ContactBlockReason = 'link' | 'email' | 'phone' | 'off_platform';

export function findContactViolation(
  text: string
): ContactBlockReason | null {
  const raw = text.trim();
  if (!raw) return null;

  const { cleaned, digitRuns } = deobfuscateForContact(raw);
  const haystack = `${raw}\n${cleaned}`;

  if (
    EMAIL_RE.test(haystack) ||
    OBFUSCATED_EMAIL_RE.test(haystack) ||
    OBFUSCATED_EMAIL_RE.test(raw)
  ) {
    return 'email';
  }

  if (OFF_PLATFORM_RE.test(haystack)) {
    return 'off_platform';
  }

  const short = haystack.match(SHORT_LINK_RE);
  if (short && !isAllowedUrl(short[0])) {
    return 'link';
  }

  if (SPOKEN_URL_RE.test(haystack) && !isAllowedUrl(haystack)) {
    // "nomadlink punto app" ok
    if (!ALLOWED_HOST_SNIPPETS.some((s) => cleaned.includes(s))) {
      return 'link';
    }
  }

  const urlMatches = haystack.match(new RegExp(URL_RE.source, 'gi'));
  if (urlMatches?.some((m) => !isAllowedUrl(m))) {
    return 'link';
  }

  if (
    hasPhoneNumber(raw, digitRuns) ||
    hasPhoneNumber(cleaned, digitRuns) ||
    hasSpelledPhoneSequence(raw)
  ) {
    return 'phone';
  }

  return null;
}
