import { z } from 'zod';

export const createTripSchema = z
  .object({
    title: z.string().min(3, 'Il titolo deve avere almeno 3 caratteri').max(500),
    destination: z.string().min(2, 'La destinazione è obbligatoria').max(100),
    startDate: z.string().min(1, 'La data di inizio è obbligatoria'),
    endDate: z.string().min(1, 'La data di fine è obbligatoria'),
    description: z.string().min(10, 'La descrizione deve avere almeno 10 caratteri').max(5000),
    image_url: z.union([z.string().url(), z.literal('')]).optional(),
    price: z.coerce.number().positive('Il prezzo deve essere maggiore di 0'),
    planningMode: z.enum(['solo', 'group']).default('group'),
    minParticipants: z.coerce.number().int().min(1, 'Minimo 1 partecipante'),
    maxParticipants: z.coerce.number().int().min(1, 'Minimo 1 partecipante'),
    minAge: z.coerce.number().int().min(18, 'Età minima 18 anni'),
    maxAge: z.coerce.number().int().min(18),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'La data di fine deve essere successiva alla data di inizio',
    path: ['endDate'],
  })
  .refine((data) => data.maxParticipants >= data.minParticipants, {
    message: 'I partecipanti massimi devono essere >= ai minimi',
    path: ['maxParticipants'],
  })
  .refine((data) => data.maxAge >= data.minAge, {
    message: 'L\'età massima deve essere >= all\'età minima',
    path: ['maxAge'],
  })
  .refine(
    (data) => data.planningMode !== 'solo' || data.minParticipants === 1,
    {
      message: 'In modalità solo il minimo deve essere 1',
      path: ['minParticipants'],
    }
  );

export const updateTripSchema = createTripSchema;

export function parseTripFormData(formData: FormData) {
  return createTripSchema.parse({
    title: formData.get('title'),
    destination: formData.get('destination'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    description: formData.get('description'),
    image_url: formData.get('image_url') || '',
    price: formData.get('price'),
    minParticipants: formData.get('minParticipants'),
    maxParticipants: formData.get('maxParticipants'),
    minAge: formData.get('minAge'),
    maxAge: formData.get('maxAge'),
    planningMode: formData.get('planningMode') || 'group',
  });
}