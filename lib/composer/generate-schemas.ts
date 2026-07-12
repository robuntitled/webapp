import { z } from 'zod';

const blockTypeEnum = z.enum([
  'flight',
  'hotel',
  'attraction',
  'transport',
  'meal',
  'free_time',
  'note',
  'activity',
]);

const alternativeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
  price: z.number().nullable().optional(),
  currency: z.string().max(8).optional(),
  notes: z.string().max(2000).optional(),
  affiliateUrl: z.string().url().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const composerBlockSchema = z.object({
  id: z.string().min(1),
  type: blockTypeEnum,
  sortOrder: z.number().int().min(0),
  content: z.record(z.string(), z.unknown()),
  alternatives: z.array(alternativeSchema).default([]),
  selectedAlternativeId: z.string().nullable(),
});

export const composerGenerateRequestSchema = z.object({
  destination: z.string().min(2).max(200),
  destinationMeta: z
    .object({
      label: z.string(),
      lat: z.number(),
      lng: z.number(),
      country: z.string().optional(),
      countryCode: z.string().optional(),
      placeType: z.string().optional(),
      placeTypeLabel: z.string().optional(),
      subtitle: z.string().optional(),
      osmId: z.string().optional(),
    })
    .optional(),
  dayIndex: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayTitle: z.string().max(200).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  planningMode: z.enum(['solo', 'group']),
  maxParticipants: z.number().int().min(1).max(99),
  intent: z.enum(['suggest_day', 'regenerate_block', 'add_alternatives']),
  currentDayBlocks: z.array(composerBlockSchema).optional(),
  otherDaysSummary: z.string().max(4000).optional(),
  targetBlockTypes: z.array(blockTypeEnum).optional(),
  tripId: z.string().uuid().optional(),
});

const travelFlightQuoteSchema = z.object({
  price: z.number(),
  currency: z.string(),
  origin: z.string(),
  destination: z.string(),
  airline: z.string().nullable().optional(),
  affiliateUrl: z.string().url().nullable().optional(),
  fromCache: z.boolean(),
});

export const composerGenerateResponseSchema = z.object({
  dayIndex: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  suggestedTitle: z.string().min(1).max(200),
  blocks: z.array(composerBlockSchema).min(1),
  quotes: z
    .object({
      flight: travelFlightQuoteSchema.optional(),
      hotel: z.object({ affiliateUrl: z.string().url().nullable().optional() }).optional(),
    })
    .optional(),
  warnings: z.array(z.string()),
  meta: z.object({
    source: z.enum(['mock', 'ai', 'cache']),
    generatedAt: z.string(),
    latencyMs: z.number().nonnegative(),
    model: z.string().optional(),
    version: z.string(),
  }),
});

export type ComposerGenerateRequestInput = z.infer<typeof composerGenerateRequestSchema>;
export type ComposerGenerateResponseOutput = z.infer<typeof composerGenerateResponseSchema>;