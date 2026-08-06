/**
 * Normalizza testo offuscato: cifre a lettere, lettere spazzate, leet leggero.
 */

const DIGIT_WORDS: Record<string, string> = {
  // IT
  zero: '0',
  uno: '1',
  una: '1',
  due: '2',
  tre: '3',
  quattro: '4',
  cinque: '5',
  sei: '6',
  sette: '7',
  otto: '8',
  nove: '9',
  // EN
  oh: '0',
  nought: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  // ES
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
  // FR
  un: '1',
  deux: '2',
  trois: '3',
  quatre: '4',
  cinq: '5',
  sept: '7',
  huit: '8',
  neuf: '9',
  // DE
  eins: '1',
  zwei: '2',
  drei: '3',
  vier: '4',
  funf: '5',
  fünf: '5',
  sechs: '6',
  acht: '8',
  neun: '9',
};

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  '$': 's',
  '!': 'i',
};

function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Collassa "c a z z o" / "c.a.z.z.o" → "cazzo". */
function collapseSpacedLetters(text: string): string {
  return text.replace(
    /\b(?:[\p{L}\d][\s._\-*/|\\]+){2,}[\p{L}\d]\b/gu,
    (chunk) => chunk.replace(/[\s._\-*/|\\]+/g, '')
  );
}

/** Sostituisce sequenze di parole-cifra con digit (es. "tre nove" → "39"). */
export function digitsFromWords(text: string): string {
  const tokens = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length === 0) return '';

  const out: string[] = [];
  let run = '';

  const flush = () => {
    if (run.length >= 8) out.push(run);
    run = '';
  };

  for (const token of tokens) {
    const d = DIGIT_WORDS[token] ?? (/^\d$/.test(token) ? token : null);
    if (d !== null) {
      run += d;
    } else {
      flush();
    }
  }
  flush();
  return out.join(' ');
}

/** Testo “pulito” per match insulti / competitor. */
export function deobfuscateForWords(text: string): string {
  let t = stripDiacritics(text.toLowerCase());
  t = t.replace(/[^\p{L}\p{N}\s@.+_-]/gu, ' ');
  t = collapseSpacedLetters(t);
  t = t
    .split('')
    .map((ch) => LEET_MAP[ch] ?? ch)
    .join('');
  t = t.replace(/(.)\1{2,}/g, '$1$1'); // fuuuck → fuuck (obscenity gestisce il resto)
  return t.replace(/\s+/g, ' ').trim();
}

/** Versione con cifre espanse dalle parole, per rilevare telefoni. */
export function deobfuscateForContact(text: string): {
  cleaned: string;
  digitRuns: string;
} {
  const cleaned = deobfuscateForWords(text);
  const fromWords = digitsFromWords(stripDiacritics(text.toLowerCase()));
  const rawDigits = text.replace(/[^\d]/g, '');
  const digitRuns = [fromWords, rawDigits].filter(Boolean).join(' ');
  return { cleaned, digitRuns };
}
