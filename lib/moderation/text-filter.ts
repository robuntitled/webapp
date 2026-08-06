import {
  DataSet,
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
  parseRawPattern,
} from 'obscenity';
import { COMPETITOR_TERMS } from '@/lib/moderation/competitors';
import { findContactViolation } from '@/lib/moderation/contact-filter';
import { deobfuscateForWords } from '@/lib/moderation/deobfuscate';
import {
  LATIN_PHRASES,
  LATIN_PROFANITY,
  NON_LATIN_TERMS,
} from '@/lib/moderation/multilingual-words';

/** Termini inglesi troppo generici / rischiosi per falsi positivi (es. same-sex). */
const ENGLISH_SOFT_REMOVE = new Set([
  'sex',
  'orgasm',
  'boob',
  'tit',
  'semen',
  'masturbate',
  'anal',
  'anus',
  'scat',
  'lubejob',
]);

export type TextBlockReason =
  | 'profanity'
  | 'link'
  | 'email'
  | 'phone'
  | 'off_platform'
  | 'competitor';

function escapePatternLiteral(word: string): string {
  return word.replace(/[\\?\[\]|]/g, '\\$&');
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMatcher(): RegExpMatcher {
  const dataset = new DataSet<{ originalWord: string }>()
    .addAll(englishDataset as DataSet<{ originalWord: string }>)
    .removePhrasesIf(
      (phrase) =>
        Boolean(
          phrase.metadata?.originalWord &&
            ENGLISH_SOFT_REMOVE.has(phrase.metadata.originalWord)
        )
    );

  const seen = new Set<string>();
  for (const word of LATIN_PROFANITY) {
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const escaped = escapePatternLiteral(key);
    dataset.addPhrase((phrase) =>
      phrase
        .setMetadata({ originalWord: key })
        .addPattern(parseRawPattern(`|${escaped}|`))
    );
  }

  return new RegExpMatcher({
    ...dataset.build(),
    ...englishRecommendedTransformers,
  });
}

const matcher = buildMatcher();

const NORMALIZED_PHRASES = LATIN_PHRASES.map(normalizeText);
const NORMALIZED_NON_LATIN = NON_LATIN_TERMS.map((t) => t.toLowerCase());
const LATIN_WORD_SET = new Set(
  LATIN_PROFANITY.map((w) => normalizeText(w)).filter((w) => w.length >= 3)
);
const NORMALIZED_COMPETITORS = COMPETITOR_TERMS.map(normalizeText).filter(
  (t) => t.length >= 4
);

function hasBlockedLatinToken(normalized: string): boolean {
  if (!normalized) return false;
  for (const token of normalized.split(' ')) {
    if (LATIN_WORD_SET.has(token)) return true;
  }
  // anche substring senza spazi (dopo collapse "c a z z o")
  const compact = normalized.replace(/\s+/g, '');
  for (const word of LATIN_WORD_SET) {
    if (word.length >= 4 && compact.includes(word)) return true;
  }
  return false;
}

function hasCompetitorMention(normalized: string): boolean {
  return NORMALIZED_COMPETITORS.some((term) => term && normalized.includes(term));
}

function hasProfanity(text: string): boolean {
  if (matcher.hasMatch(text)) return true;

  const normalized = normalizeText(text);
  if (normalized && hasBlockedLatinToken(normalized)) return true;
  if (NORMALIZED_PHRASES.some((p) => p && normalized.includes(p))) return true;

  const lower = text.toLowerCase();
  if (NORMALIZED_NON_LATIN.some((t) => t && lower.includes(t))) return true;

  return false;
}

/** Motivo del blocco, o null se il testo è ok. */
export function findTextBlockReason(text: string): TextBlockReason | null {
  const raw = text.trim();
  if (!raw) return null;

  const contact = findContactViolation(raw);
  if (contact) return contact;

  const deobfuscated = deobfuscateForWords(raw);
  const variants = [raw, deobfuscated, normalizeText(deobfuscated)];

  for (const variant of variants) {
    if (!variant) continue;
    if (hasCompetitorMention(normalizeText(variant))) return 'competitor';
    if (hasProfanity(variant)) return 'profanity';
  }

  return null;
}

/** True se il testo viola le linee guida. */
export function textLooksUnsafe(text: string): boolean {
  return findTextBlockReason(text) !== null;
}
