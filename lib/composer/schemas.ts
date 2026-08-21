import { z } from 'zod';

const alternativeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
  price: z.number().nullable().optional(),
  currency: z.string().max(8).optional(),
  notes: z.string().max(2000).optional(),
  affiliateUrl: z.string().url().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const blockSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'flight',
    'hotel',
    'attraction',
    'transport',
    'meal',
    'free_time',
    'note',
    'activity',
  ]),
  sortOrder: z.number().int().min(0),
  content: z.record(z.string(), z.unknown()),
  alternatives: z.array(alternativeSchema).default([]),
  selectedAlternativeId: z.string().nullable(),
});

const daySchema = z.object({
  dayIndex: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(200),
  blocks: z.array(blockSchema),
});

export const publishComposerSchema = z
  .object({
    title: z.string().min(3).max(500),
    destination: z.string().min(2).max(200),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    planningMode: z.enum(['solo', 'group']),
    maxParticipants: z.number().int().min(1).max(99),
    minParticipants: z.number().int().min(1).max(99).optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    days: z.array(daySchema).min(1),
    budgetOrientativo: z.number().int().min(80).max(8000).optional(),
    hotelRule: z.enum(['A', 'B', 'C']).optional(),
    templateId: z.string().max(80).optional(),
    catalogDestinationId: z.string().max(80).optional(),
    durationDays: z.number().int().min(3).max(30).optional(),
    departureCity: z.string().max(120).optional(),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'La data di fine deve essere dopo l\'inizio',
    path: ['endDate'],
  })
  .refine(
    (d) => !d.minParticipants || d.maxParticipants >= d.minParticipants,
    {
      message: 'I posti max devono essere almeno il minimo',
      path: ['maxParticipants'],
    }
  );

export type PublishComposerInput = z.infer<typeof publishComposerSchema>;