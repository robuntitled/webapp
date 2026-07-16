import { z } from 'zod';

export const plannerProfileSchema = z.object({
  travelStyle: z.enum(['adventure', 'relax', 'culture', 'food', 'mix']),
  pace: z.enum(['slow', 'balanced', 'intense']),
  budgetLevel: z.enum(['budget', 'mid', 'premium']),
  interests: z.array(z.string().min(1).max(40)).max(12),
  accommodationPref: z.enum(['hostel', 'hotel', 'apartment', 'any']),
  experienceLevel: z.enum(['first_time', 'been_before', 'expert']),
  travelDistance: z.enum(['near', 'medium', 'far']).optional(),
  dietaryNotes: z.string().max(500).optional(),
  mobilityNotes: z.string().max(500).optional(),
  freeNotes: z.string().max(1000).optional(),
});