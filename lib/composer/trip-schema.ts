import { z } from 'zod';
import { aiDayBlockSpecSchema, type AiDayBlockSpec } from '@/lib/composer/ai-day-schema';

export const aiTripDaySchema = z.object({
  dayIndex: z.number().int().min(1).max(60),
  title: z.string().min(1).max(160),
  blocks: z.array(aiDayBlockSpecSchema).min(2).max(9),
});

export const aiTripPlanSchema = z.object({
  tripTitle: z.string().min(1).max(160),
  days: z.array(aiTripDaySchema).min(1).max(21),
});

export type AiTripDay = z.infer<typeof aiTripDaySchema>;
export type AiTripPlan = z.infer<typeof aiTripPlanSchema>;

/** JSON Schema per structured output Gemini. */
export const aiTripPlanGeminiSchema = {
  type: 'object',
  properties: {
    tripTitle: { type: 'string' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dayIndex: { type: 'integer' },
          title: { type: 'string' },
          blocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'flight',
                    'hotel',
                    'attraction',
                    'transport',
                    'meal',
                    'free_time',
                    'note',
                    'activity',
                  ],
                },
                title: { type: 'string' },
                timeSlot: {
                  type: 'string',
                  enum: ['morning', 'afternoon', 'evening', 'night', 'flex'],
                },
                place: { type: 'string' },
                description: { type: 'string' },
                duration: { type: 'string' },
                from: { type: 'string' },
                to: { type: 'string' },
                body: { type: 'string' },
                mode: { type: 'string' },
              },
              required: ['type', 'title', 'timeSlot'],
            },
          },
        },
        required: ['dayIndex', 'title', 'blocks'],
      },
    },
  },
  required: ['tripTitle', 'days'],
} as const;

const BLOCK_TYPES = new Set([
  'flight',
  'hotel',
  'attraction',
  'transport',
  'meal',
  'free_time',
  'note',
  'activity',
]);

const BLOCK_TYPE_ALIASES: Record<string, string> = {
  food: 'meal',
  restaurant: 'meal',
  dining: 'meal',
  breakfast: 'meal',
  lunch: 'meal',
  dinner: 'meal',
  sightseeing: 'attraction',
  place: 'attraction',
  museum: 'attraction',
  tour: 'activity',
  experience: 'activity',
  transfer: 'transport',
  commute: 'transport',
  train: 'transport',
  lodging: 'hotel',
  accommodation: 'hotel',
  checkin: 'hotel',
  checkout: 'hotel',
  reminder: 'note',
  memo: 'note',
  leisure: 'free_time',
  freetime: 'free_time',
  'free time': 'free_time',
};

const TIME_SLOTS = new Set(['morning', 'afternoon', 'evening', 'night', 'flex']);

const TIME_SLOT_ALIASES: Record<string, string> = {
  mattina: 'morning',
  mattino: 'morning',
  pomeriggio: 'afternoon',
  sera: 'evening',
  serata: 'evening',
  notte: 'night',
  flessibile: 'flex',
  libero: 'flex',
};

/**
 * Frasi segnaposto che l'LLM produce quando non conosce l'aeroporto.
 * Vanno rimosse: meglio un titolo onesto che un finto scalo.
 */
const VAGUE_AIRPORT_PATTERNS = [
  /aeroporto\s+internazionale\s+pi(u|ù)\s+vicino/i,
  /aeroporto\s+pi(u|ù)\s+vicino/i,
  /nearest\s+(international\s+)?airport/i,
  /aeroporto\s+di\s+destinazione/i,
  /aeroporto\s+locale/i,
  /\bDEST\b/,
  /\bXXX\b/,
  /aeroporto\s+da\s+definire/i,
];

export function containsVagueAirport(value: string | undefined): boolean {
  if (!value) return false;
  return VAGUE_AIRPORT_PATTERNS.some((re) => re.test(value));
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeType(raw: unknown): AiDayBlockSpec['type'] | null {
  const value = asString(raw).toLowerCase().replace(/[_\s-]+/g, (m) => (m === '_' ? '_' : ' '));
  if (BLOCK_TYPES.has(value)) return value as AiDayBlockSpec['type'];
  const alias = BLOCK_TYPE_ALIASES[value] ?? BLOCK_TYPE_ALIASES[value.replace(/\s+/g, '')];
  return (alias as AiDayBlockSpec['type']) ?? null;
}

function normalizeTimeSlot(raw: unknown): AiDayBlockSpec['timeSlot'] {
  const value = asString(raw).toLowerCase();
  if (TIME_SLOTS.has(value)) return value as AiDayBlockSpec['timeSlot'];
  return (TIME_SLOT_ALIASES[value] ?? 'flex') as AiDayBlockSpec['timeSlot'];
}

/**
 * Sostituisce i segnaposto aeroporto con l'etichetta reale risolta lato server.
 * Se non abbiamo un aeroporto, ripiega sul nome città (mai "più vicino").
 */
function sanitizeAirportText(
  value: string,
  replacements: { airportLabel?: string | null; cityLabel: string }
): string {
  const target = replacements.airportLabel || replacements.cityLabel;
  let out = value;
  for (const re of VAGUE_AIRPORT_PATTERNS) {
    out = out.replace(new RegExp(re.source, re.flags.includes('i') ? 'gi' : 'g'), target);
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

function normalizeBlock(
  raw: unknown,
  ctx: { airportLabel?: string | null; cityLabel: string }
): AiDayBlockSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const type = normalizeType(obj.type);
  const title = sanitizeAirportText(asString(obj.title), ctx);
  if (!type || !title) return null;

  const block: AiDayBlockSpec = {
    type,
    title: title.slice(0, 120),
    timeSlot: normalizeTimeSlot(obj.timeSlot),
  };

  const optional: Array<[keyof AiDayBlockSpec, string, number]> = [
    ['place', asString(obj.place), 120],
    ['description', asString(obj.description), 300],
    ['duration', asString(obj.duration), 40],
    ['from', asString(obj.from), 80],
    ['to', asString(obj.to), 80],
    ['body', asString(obj.body), 400],
    ['mode', asString(obj.mode), 40],
  ];

  for (const [key, value, max] of optional) {
    if (!value) continue;
    const cleaned = sanitizeAirportText(value, ctx).slice(0, max);
    if (cleaned) {
      (block as Record<string, unknown>)[key] = cleaned;
    }
  }

  return block;
}

export type TripNormalizeContext = {
  totalDays: number;
  cityLabel: string;
  airportLabel?: string | null;
};

/**
 * Normalizza l'output grezzo del modello prima della validazione Zod:
 * ordina i giorni, ripara dayIndex mancanti/duplicati, scarta blocchi invalidi
 * e ripulisce i segnaposto aeroporto.
 */
export function normalizeAiTripPlan(
  raw: unknown,
  ctx: TripNormalizeContext
): AiTripPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const tripTitle = asString(obj.tripTitle || obj.title || obj.suggestedTitle);
  const daysRaw = Array.isArray(obj.days)
    ? obj.days
    : Array.isArray(obj.itinerary)
      ? obj.itinerary
      : [];
  if (daysRaw.length === 0) return null;

  const used = new Set<number>();
  const days: AiTripDay[] = [];

  daysRaw.forEach((entry, position) => {
    if (!entry || typeof entry !== 'object') return;
    const day = entry as Record<string, unknown>;

    const rawIndex = Number(day.dayIndex ?? day.day ?? day.index ?? position + 1);
    let dayIndex =
      Number.isFinite(rawIndex) && rawIndex >= 1 ? Math.floor(rawIndex) : position + 1;
    if (dayIndex > ctx.totalDays || used.has(dayIndex)) {
      // Riassegna al primo slot libero: meglio un giorno spostato che perso
      const free = Array.from({ length: ctx.totalDays }, (_, i) => i + 1).find(
        (i) => !used.has(i)
      );
      if (!free) return;
      dayIndex = free;
    }

    const blocksRaw = Array.isArray(day.blocks) ? day.blocks : [];
    const blocks = blocksRaw
      .map((b) => normalizeBlock(b, ctx))
      .filter((b): b is AiDayBlockSpec => b !== null)
      .slice(0, 9);

    if (blocks.length < 2) return;

    used.add(dayIndex);
    days.push({
      dayIndex,
      title: sanitizeAirportText(
        asString(day.title || day.suggestedTitle) || `Giorno ${dayIndex}`,
        ctx
      ).slice(0, 160),
      blocks,
    });
  });

  if (days.length === 0) return null;
  days.sort((a, b) => a.dayIndex - b.dayIndex);

  return {
    tripTitle: sanitizeAirportText(tripTitle || `Viaggio a ${ctx.cityLabel}`, ctx).slice(0, 160),
    days,
  };
}
