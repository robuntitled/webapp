import { describe, expect, it } from 'vitest';
import { normalizeAiDayPlan } from '@/lib/composer/ai-day-normalize';

describe('normalizeAiDayPlan', () => {
  it('maps Italian time slots and block aliases', () => {
    const plan = normalizeAiDayPlan({
      suggestedTitle: 'Giorno a Monte San Giusto',
      blocks: [
        { type: 'transport', title: 'Transfer da Ancona', timeSlot: 'mattina' },
        { type: 'sightseeing', title: 'Centro storico', timeSlot: 'pomeriggio', place: 'Monte San Giusto' },
        { type: 'food', title: 'Cena in trattoria', timeSlot: 'sera' },
      ],
    });

    expect(plan?.blocks[0].timeSlot).toBe('morning');
    expect(plan?.blocks[1].type).toBe('attraction');
    expect(plan?.blocks[2].type).toBe('meal');
  });
});