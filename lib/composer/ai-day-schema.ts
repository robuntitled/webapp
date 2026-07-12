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

const timeSlotEnum = z.enum(['morning', 'afternoon', 'evening', 'night', 'flex']);

export const aiDayBlockSpecSchema = z.object({
  type: blockTypeEnum,
  title: z.string().min(1).max(120),
  timeSlot: timeSlotEnum,
  place: z.string().max(120).optional(),
  description: z.string().max(300).optional(),
  duration: z.string().max(40).optional(),
  from: z.string().max(80).optional(),
  to: z.string().max(80).optional(),
  body: z.string().max(400).optional(),
  mode: z.string().max(40).optional(),
});

export const aiDayPlanSchema = z.object({
  suggestedTitle: z.string().min(1).max(200),
  blocks: z.array(aiDayBlockSpecSchema).min(3).max(10),
});

export type AiDayBlockSpec = z.infer<typeof aiDayBlockSpecSchema>;
export type AiDayPlan = z.infer<typeof aiDayPlanSchema>;

/** JSON Schema per Gemini structured output */
export const aiDayPlanGeminiSchema = {
  type: 'object',
  properties: {
    suggestedTitle: { type: 'string' },
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
  required: ['suggestedTitle', 'blocks'],
} as const;