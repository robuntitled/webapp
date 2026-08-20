import { z } from 'zod';
import { isValidKeywordId } from '@/lib/onboarding/keywords';

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
    .max(24)
    .refine((ids) => ids.every(isValidKeywordId), 'Keyword non valida')
    .default([]),
  home: onboardingHomeSchema,
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
