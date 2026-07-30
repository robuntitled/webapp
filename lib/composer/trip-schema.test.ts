import { describe, expect, it } from 'vitest';
import {
  aiTripPlanSchema,
  containsVagueAirport,
  normalizeAiTripPlan,
} from '@/lib/composer/trip-schema';

const ctx = {
  totalDays: 4,
  cityLabel: 'Sydney',
  airportLabel: 'Sydney Kingsford Smith (SYD)',
};

function day(dayIndex: number, extra: Record<string, unknown> = {}) {
  return {
    dayIndex,
    title: `Giorno ${dayIndex}`,
    blocks: [
      { type: 'meal', title: 'Colazione al Bourke Street Bakery', timeSlot: 'morning' },
      { type: 'attraction', title: 'Opera House', timeSlot: 'afternoon' },
    ],
    ...extra,
  };
}

describe('normalizeAiTripPlan', () => {
  it('parses a well-formed multi-day plan', () => {
    const plan = normalizeAiTripPlan(
      { tripTitle: 'Sydney in 4 giorni', days: [day(1), day(2), day(3), day(4)] },
      ctx
    );

    expect(plan).not.toBeNull();
    expect(plan!.days).toHaveLength(4);
    expect(plan!.days.map((d) => d.dayIndex)).toEqual([1, 2, 3, 4]);
    expect(aiTripPlanSchema.safeParse(plan).success).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(normalizeAiTripPlan(null, ctx)).toBeNull();
    expect(normalizeAiTripPlan('{}', ctx)).toBeNull();
    expect(normalizeAiTripPlan({ days: [] }, ctx)).toBeNull();
  });

  it('accepts itinerary/day aliases from the model', () => {
    const plan = normalizeAiTripPlan(
      {
        title: 'Sydney express',
        itinerary: [
          { day: 1, title: 'Arrivo', blocks: day(1).blocks },
          { day: 2, title: 'Città', blocks: day(2).blocks },
        ],
      },
      ctx
    );

    expect(plan!.tripTitle).toBe('Sydney express');
    expect(plan!.days.map((d) => d.dayIndex)).toEqual([1, 2]);
  });

  it('sorts days and reassigns duplicate or out-of-range indexes', () => {
    const plan = normalizeAiTripPlan(
      { tripTitle: 'T', days: [day(3), day(1), day(1), day(99)] },
      ctx
    );

    const indexes = plan!.days.map((d) => d.dayIndex);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(new Set(indexes).size).toBe(indexes.length);
    expect(indexes.every((i) => i >= 1 && i <= ctx.totalDays)).toBe(true);
  });

  it('drops days with fewer than two valid blocks', () => {
    const plan = normalizeAiTripPlan(
      {
        tripTitle: 'T',
        days: [
          day(1),
          { dayIndex: 2, title: 'Vuoto', blocks: [{ type: 'meal', title: 'Pranzo', timeSlot: 'flex' }] },
          { dayIndex: 3, title: 'Spazzatura', blocks: [{ type: 'nope', title: '' }, null, 42] },
        ],
      },
      ctx
    );

    expect(plan!.days.map((d) => d.dayIndex)).toEqual([1]);
  });

  it('maps block type and time slot aliases, including Italian slots', () => {
    const plan = normalizeAiTripPlan(
      {
        tripTitle: 'T',
        days: [
          {
            dayIndex: 1,
            title: 'Arrivo',
            blocks: [
              { type: 'transfer', title: 'Taxi in centro', timeSlot: 'pomeriggio' },
              { type: 'lodging', title: 'Check-in Ovolo Woolloomooloo', timeSlot: 'sera' },
              { type: 'dinner', title: 'Cena da Quay', timeSlot: 'notte' },
              { type: 'freetime', title: 'Passeggiata', timeSlot: 'boh' },
            ],
          },
        ],
      },
      ctx
    );

    expect(plan!.days[0].blocks.map((b) => b.type)).toEqual([
      'transport',
      'hotel',
      'meal',
      'free_time',
    ]);
    expect(plan!.days[0].blocks.map((b) => b.timeSlot)).toEqual([
      'afternoon',
      'evening',
      'night',
      'flex',
    ]);
  });

  it('replaces vague airport placeholders with the resolved airport', () => {
    const plan = normalizeAiTripPlan(
      {
        tripTitle: 'Volo verso aeroporto internazionale più vicino',
        days: [
          {
            dayIndex: 1,
            title: 'Arrivo all’aeroporto più vicino',
            blocks: [
              {
                type: 'flight',
                title: 'Volo FCO → Aeroporto internazionale più vicino',
                timeSlot: 'morning',
                to: 'nearest international airport',
              },
              {
                type: 'transport',
                title: 'Transfer dall’aeroporto locale all’hotel',
                timeSlot: 'afternoon',
                from: 'Aeroporto da definire',
              },
            ],
          },
        ],
      },
      ctx
    );

    const serialized = JSON.stringify(plan);
    expect(containsVagueAirport(serialized)).toBe(false);
    expect(serialized).toContain('Sydney Kingsford Smith (SYD)');
  });

  it('falls back to the city name when no airport is resolved', () => {
    const plan = normalizeAiTripPlan(
      {
        tripTitle: 'T',
        days: [
          {
            dayIndex: 1,
            title: 'Arrivo',
            blocks: [
              { type: 'flight', title: 'Volo verso aeroporto più vicino', timeSlot: 'morning' },
              { type: 'meal', title: 'Cena', timeSlot: 'evening' },
            ],
          },
        ],
      },
      { totalDays: 2, cityLabel: 'Sydney', airportLabel: null }
    );

    expect(plan!.days[0].blocks[0].title).toBe('Volo verso Sydney');
  });

  it('truncates overlong strings and caps blocks per day', () => {
    const many = Array.from({ length: 14 }, (_, i) => ({
      type: 'attraction',
      title: `Tappa ${i + 1}`,
      timeSlot: 'flex',
      description: 'x'.repeat(500),
    }));

    const plan = normalizeAiTripPlan(
      { tripTitle: 'T'.repeat(400), days: [{ dayIndex: 1, title: 'A'.repeat(400), blocks: many }] },
      ctx
    );

    expect(plan!.days[0].blocks).toHaveLength(9);
    expect(plan!.tripTitle.length).toBeLessThanOrEqual(160);
    expect(plan!.days[0].title.length).toBeLessThanOrEqual(160);
    expect(plan!.days[0].blocks[0].description!.length).toBeLessThanOrEqual(300);
    expect(aiTripPlanSchema.safeParse(plan).success).toBe(true);
  });

  it('always produces schema-valid output', () => {
    const messy = {
      days: [
        { day: '2', title: '', blocks: day(2).blocks },
        { blocks: day(1).blocks },
        { dayIndex: 2.7, title: 'Duplicato', blocks: day(2).blocks },
      ],
    };

    const plan = normalizeAiTripPlan(messy, ctx);
    expect(aiTripPlanSchema.safeParse(plan).success).toBe(true);
  });
});

describe('containsVagueAirport', () => {
  it.each([
    'Aeroporto internazionale più vicino',
    'aeroporto piu vicino',
    'Nearest International Airport',
    'Volo FCO → DEST',
    'Aeroporto da definire',
  ])('flags %s', (value) => {
    expect(containsVagueAirport(value)).toBe(true);
  });

  it.each(['Sydney Kingsford Smith (SYD)', 'Volo FCO → SYD', undefined])(
    'accepts %s',
    (value) => {
      expect(containsVagueAirport(value)).toBe(false);
    }
  );
});
