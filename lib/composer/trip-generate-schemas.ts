import { z } from 'zod';
import { plannerProfileSchema } from '@/lib/validations/planner';
import { composerBlockSchema } from '@/lib/composer/generate-schemas';
import { MAX_TRIP_DAYS } from '@/lib/composer/trip-limits';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const composerOriginSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  iata: z.string().regex(/^[A-Za-z]{3}$/),
  role: z.enum(['organizer', 'crew']),
});

export const composerTripGenerateRequestSchema = z.object({
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
  startDate: isoDate,
  endDate: isoDate,
  days: z
    .array(
      z.object({
        dayIndex: z.number().int().min(1).max(60),
        date: isoDate,
        title: z.string().max(200).optional(),
      })
    )
    .min(1)
    .max(MAX_TRIP_DAYS),
  planningMode: z.enum(['solo', 'group']),
  maxParticipants: z.number().int().min(1).max(99),
  organizerOrigin: composerOriginSchema.optional(),
  crewOrigins: z.array(composerOriginSchema).max(8).optional(),
  plannerProfile: plannerProfileSchema.optional(),
  roundtrip: z.boolean().optional(),
  tripId: z.string().uuid().optional(),
});

export const composerTripGenerateResponseSchema = z.object({
  tripTitle: z.string().min(1).max(200),
  days: z
    .array(
      z.object({
        dayIndex: z.number().int().min(1),
        date: isoDate,
        suggestedTitle: z.string().min(1).max(200),
        blocks: z.array(composerBlockSchema),
      })
    )
    .min(1),
  quotes: z
    .object({
      flight: z.record(z.string(), z.unknown()).optional(),
      flights: z.array(z.record(z.string(), z.unknown())).optional(),
      hotel: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  warnings: z.array(z.string()),
  meta: z.object({
    source: z.enum(['mock', 'ai', 'cache']),
    generatedAt: z.string(),
    latencyMs: z.number().nonnegative(),
    model: z.string().optional(),
    version: z.string(),
    daysFilled: z.number().int().nonnegative(),
    blocksTotal: z.number().int().nonnegative(),
    enrichment: z.object({
      flights: z.boolean(),
      hotels: z.boolean(),
      activities: z.boolean(),
      transfers: z.boolean(),
    }),
  }),
});

export type ComposerTripGenerateRequestInput = z.infer<
  typeof composerTripGenerateRequestSchema
>;
