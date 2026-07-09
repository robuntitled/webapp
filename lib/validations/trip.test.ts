import { describe, expect, it } from 'vitest';
import { createTripSchema } from '@/lib/validations/trip';

describe('createTripSchema', () => {
  it('accepts valid trip data', () => {
    const result = createTripSchema.safeParse({
      title: 'Viaggio in Thailandia',
      destination: 'Thailandia',
      startDate: '2026-08-01',
      endDate: '2026-08-15',
      description: 'Un viaggio fantastico tra spiagge e templi.',
      image_url: 'https://images.pexels.com/photos/1.jpeg',
      price: 1500,
      minParticipants: 2,
      maxParticipants: 8,
      minAge: 18,
      maxAge: 35,
    });

    expect(result.success).toBe(true);
  });

  it('rejects end date before start date', () => {
    const result = createTripSchema.safeParse({
      title: 'Viaggio',
      destination: 'Roma',
      startDate: '2026-08-15',
      endDate: '2026-08-01',
      description: 'Descrizione sufficientemente lunga.',
      price: 100,
      minParticipants: 2,
      maxParticipants: 4,
      minAge: 18,
      maxAge: 30,
    });

    expect(result.success).toBe(false);
  });

  it('accepts solo planning with one participant', () => {
    const result = createTripSchema.safeParse({
      title: 'Viaggio solitario',
      destination: 'Lisbona',
      startDate: '2026-09-01',
      endDate: '2026-09-07',
      description: 'Un weekend da solo, poi forse si unisce qualcuno.',
      price: 400,
      planningMode: 'solo',
      minParticipants: 1,
      maxParticipants: 4,
      minAge: 18,
      maxAge: 999,
    });

    expect(result.success).toBe(true);
  });
});