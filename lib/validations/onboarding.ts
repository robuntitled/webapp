import { z } from 'zod';
import { KEYWORD_BY_ID, isValidKeywordId } from '@/lib/onboarding/keywords';

export const onboardingHomeSchema = z.object({
  city: z.string().trim().min(2).max(120),
  country: z.string().trim().max(80).nullable().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  placeId: z.string().trim().max(80).nullable().optional(),
});

export const completeOnboardingSchema = z.object({
  intent: z.enum(['create', 'book']),
  keywordIds: z
    .array(z.string().min(1).max(40))
    .min(3)
    .max(24)
    .refine((ids) => ids.every(isValidKeywordId), 'Keyword non valida')
    .refine((ids) => {
      const cats = new Set(
        ids.map((id) => KEYWORD_BY_ID.get(id)?.category).filter(Boolean)
      );
      return cats.has('trip_type') && cats.has('setting') && cats.has('experience');
    }, 'Seleziona tipologia, ambiente ed esperienza'),
  home: onboardingHomeSchema,
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
