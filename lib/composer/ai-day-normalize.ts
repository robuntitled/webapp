import type { ComposerBlockType } from '@/types/composer';
import type { AiDayBlockSpec, AiDayPlan } from '@/lib/composer/ai-day-schema';

const BLOCK_TYPES = new Set<ComposerBlockType>([
  'flight',
  'hotel',
  'attraction',
  'transport',
  'meal',
  'free_time',
  'note',
  'activity',
]);

const BLOCK_TYPE_ALIASES: Record<string, ComposerBlockType> = {
  food: 'meal',
  restaurant: 'meal',
  dining: 'meal',
  sightseeing: 'attraction',
  place: 'attraction',
  tour: 'activity',
  experience: 'activity',
  transfer: 'transport',
  commute: 'transport',
  lodging: 'hotel',
  accommodation: 'hotel',
  reminder: 'note',
  memo: 'note',
  leisure: 'free_time',
};

const TIME_SLOTS = new Set(['morning', 'afternoon', 'evening', 'night', 'flex']);

const TIME_SLOT_ALIASES: Record<string, string> = {
  mattina: 'morning',
  pomeriggio: 'afternoon',
  sera: 'evening',
  notte: 'night',
  flessibile: 'flex',
  flex: 'flex',
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeBlockType(raw: unknown): ComposerBlockType | null {
  const value = asString(raw).toLowerCase();
  if (BLOCK_TYPES.has(value as ComposerBlockType)) return value as ComposerBlockType;
  return BLOCK_TYPE_ALIASES[value] ?? null;
}

function normalizeTimeSlot(raw: unknown): string {
  const value = asString(raw).toLowerCase();
  if (TIME_SLOTS.has(value)) return value;
  return TIME_SLOT_ALIASES[value] ?? 'flex';
}

function normalizeBlock(raw: unknown): AiDayBlockSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const type = normalizeBlockType(obj.type);
  const title = asString(obj.title);
  if (!type || !title) return null;

  const block: AiDayBlockSpec = {
    type,
    title: title.slice(0, 120),
    timeSlot: normalizeTimeSlot(obj.timeSlot) as AiDayBlockSpec['timeSlot'],
  };

  const place = asString(obj.place);
  const description = asString(obj.description);
  const duration = asString(obj.duration);
  const from = asString(obj.from);
  const to = asString(obj.to);
  const body = asString(obj.body);
  const mode = asString(obj.mode);

  if (place) block.place = place.slice(0, 120);
  if (description) block.description = description.slice(0, 300);
  if (duration) block.duration = duration.slice(0, 40);
  if (from) block.from = from.slice(0, 80);
  if (to) block.to = to.slice(0, 80);
  if (body) block.body = body.slice(0, 400);
  if (mode) block.mode = mode.slice(0, 40);

  return block;
}

/** Normalizza output grezzo Gemini prima della validazione Zod. */
export function normalizeAiDayPlan(raw: unknown): AiDayPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const suggestedTitle = asString(obj.suggestedTitle || obj.title || obj.dayTitle);
  const blocksRaw = Array.isArray(obj.blocks) ? obj.blocks : [];

  const blocks = blocksRaw
    .map(normalizeBlock)
    .filter((b): b is AiDayBlockSpec => b !== null)
    .slice(0, 10);

  if (!suggestedTitle || blocks.length < 3) return null;

  return {
    suggestedTitle: suggestedTitle.slice(0, 200),
    blocks,
  };
}