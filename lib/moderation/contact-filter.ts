/** Domini propri ammessi (link NomadLink ok). */
const ALLOWED_HOST_SNIPPETS = [
  'nomadlink',
  'webapp-bice-six-42.vercel.app',
];

const EMAIL_RE =
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** "nome at dominio dot com" / "nome[at]dominio[dot]com" */
const OBFUSCATED_EMAIL_RE =
  /[a-z0-9._%+-]+\s*(?:@|\[at\]|\(at\)|\sat\s)\s*[a-z0-9.-]+\s*(?:\.|\[dot\]|\(dot\)|\sdot\s)\s*[a-z]{2,}/i;

const URL_RE =
  /(?:https?:\/\/|hxxps?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|it|net|org|io|app|info|co|eu|me|dev|ai|xyz|online|site|travel)(?:\/[^\s<>"']*)?/i;

const SHORT_LINK_RE =
  /\b(?:wa\.me|t\.me|bit\.ly|tinyurl\.com|goo\.gl|rb\.gy|cutt\.ly|is\.gd|ow\.ly)\/[\w/-]+/i;

/** Canali per spostare il contatto fuori piattaforma. */
const OFF_PLATFORM_RE =
  /\b(?:whatsapp|whats\s*app|telegram|wickr|signal\s*app|line\s*app)\b/i;

function isAllowedUrl(match: string): boolean {
  const lower = match.toLowerCase();
  return ALLOWED_HOST_SNIPPETS.some((s) => lower.includes(s));
}

function hasPhoneNumber(text: string): boolean {
  // Prefisso internazionale esplicito (+39 / 0039 / +1 …)
  if (/(?:\+|00)\s*\d{1,3}[\s./()-]*(?:\d[\s./()-]*){7,14}\d/.test(text)) {
    return true;
  }

  // Cellulare IT: 3xx xxx xxxx (10 cifre)
  if (/(?<!\d)3\d{2}[\s./()-]?\d{3}[\s./()-]?\d{4}(?!\d)/.test(text)) {
    return true;
  }

  // Compatto senza spazi: 3331234567 / 393331234567
  const compact = text.replace(/[\s./()-]/g, '');
  if (/(?<!\d)(?:\+?39)?3\d{9}(?!\d)/.test(compact)) {
    return true;
  }

  return false;
}

export type ContactBlockReason = 'link' | 'email' | 'phone' | 'off_platform';

export function findContactViolation(
  text: string
): ContactBlockReason | null {
  const raw = text.trim();
  if (!raw) return null;

  if (EMAIL_RE.test(raw) || OBFUSCATED_EMAIL_RE.test(raw)) {
    return 'email';
  }

  if (OFF_PLATFORM_RE.test(raw)) {
    return 'off_platform';
  }

  const short = raw.match(SHORT_LINK_RE);
  if (short && !isAllowedUrl(short[0])) {
    return 'link';
  }

  const urlMatches = raw.match(new RegExp(URL_RE.source, 'gi'));
  if (urlMatches?.some((m) => !isAllowedUrl(m))) {
    return 'link';
  }

  if (hasPhoneNumber(raw)) {
    return 'phone';
  }

  return null;
}
