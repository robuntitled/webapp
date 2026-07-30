import { describe, expect, it } from 'vitest';
import { aiTripToDays, buildTripGenerationPrompt } from '@/lib/composer/ai-trip-generator';
import { resolveDestinationContext } from '@/lib/composer/destination-context';
import { containsVagueAirport, type AiTripPlan } from '@/lib/composer/trip-schema';
import type { ComposerTripGenerateRequest } from '@/types/composer';

const days = [
  { dayIndex: 1, date: '2026-09-01' },
  { dayIndex: 2, date: '2026-09-02' },
  { dayIndex: 3, date: '2026-09-03' },
];

const req = {
  destination: 'Sydney, Australia',
  destinationMeta: {
    label: 'Sydney',
    lat: -33.8688,
    lng: 151.2093,
    country: 'Australia',
    countryCode: 'AU',
    placeType: 'city',
  },
  startDate: '2026-09-01',
  endDate: '2026-09-03',
  days,
  planningMode: 'group',
  maxParticipants: 4,
} as unknown as ComposerTripGenerateRequest;

function ctx(overrides: Record<string, unknown> = {}) {
  return {
    req,
    destination: resolveDestinationContext(req.destination, req.destinationMeta),
    originIata: 'FCO',
    originCity: 'Roma',
    roundtrip: true,
    ...overrides,
  } as Parameters<typeof buildTripGenerationPrompt>[0];
}

describe('buildTripGenerationPrompt', () => {
  it('states the resolved airport and origin explicitly', () => {
    const { userPrompt } = buildTripGenerationPrompt(ctx());

    expect(userPrompt).toContain('airport=SYD');
    expect(userPrompt).toContain('IATA=FCO');
    expect(userPrompt).toContain('coord=-33.869,151.209');
    expect(containsVagueAirport(userPrompt)).toBe(false);
  });

  it('lists every day with its phase', () => {
    const { userPrompt } = buildTripGenerationPrompt(ctx());

    expect(userPrompt).toContain('giorno 1 (2026-09-01) fase=ARRIVO');
    expect(userPrompt).toContain('giorno 2 (2026-09-02) fase=ESPLORAZIONE');
    expect(userPrompt).toContain('giorno 3 (2026-09-03) fase=PARTENZA');
    expect(userPrompt).toContain('Genera esattamente 3 oggetti');
  });

  it('marks the airport as unknown instead of inventing one', () => {
    const { userPrompt } = buildTripGenerationPrompt(
      ctx({
        destination: resolveDestinationContext('Villaggio remoto, Nowhereland', {
          label: 'Villaggio remoto',
          lat: 1,
          lng: 1,
          countryCode: 'ZZ',
          placeType: 'village',
        }),
      })
    );

    expect(userPrompt).toContain('airport=sconosciuto');
    expect(containsVagueAirport(userPrompt)).toBe(false);
  });

  it('signals a one-way trip', () => {
    expect(buildTripGenerationPrompt(ctx({ roundtrip: false })).userPrompt).toContain('return=no');
  });

  it('ships a structured-output schema requiring days', () => {
    const { responseSchema, systemPrompt, jsonSuffix } = buildTripGenerationPrompt(ctx());

    expect((responseSchema as { required: string[] }).required).toContain('days');
    expect(systemPrompt.length).toBeGreaterThan(200);
    expect(jsonSuffix).toContain('JSON');
  });
});

describe('aiTripToDays', () => {
  const plan: AiTripPlan = {
    tripTitle: 'Sydney in 3 giorni',
    days: [
      {
        dayIndex: 1,
        title: 'Arrivo',
        blocks: [
          {
            type: 'flight',
            title: 'Volo FCO → SYD',
            timeSlot: 'morning',
            from: 'Roma Fiumicino (FCO)',
            to: 'Sydney Kingsford Smith (SYD)',
          },
          { type: 'meal', title: 'Cena a Surry Hills', timeSlot: 'evening', place: 'Surry Hills' },
        ],
      },
      {
        dayIndex: 3,
        title: 'Partenza',
        blocks: [
          { type: 'transport', title: 'Transfer aeroporto', timeSlot: 'afternoon' },
          { type: 'flight', title: 'Volo SYD → FCO', timeSlot: 'evening' },
        ],
      },
    ],
  };

  it('maps AI days onto the real calendar dates', () => {
    const result = aiTripToDays(plan, days);

    expect(result.tripTitle).toBe('Sydney in 3 giorni');
    expect(result.days.map((d) => d.date)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
    ]);
    expect(result.days[0].blocks[0].type).toBe('flight');
    expect(result.days[0].blocks[0].content.to).toBe('Sydney Kingsford Smith (SYD)');
  });

  it('leaves skipped days empty so the orchestrator can fill them', () => {
    const result = aiTripToDays(plan, days);

    expect(result.days[1].blocks).toEqual([]);
    expect(result.days[1].suggestedTitle).toBe('Giorno 2');
  });

  it('assigns contiguous sortOrder within each day', () => {
    const result = aiTripToDays(plan, days);

    expect(result.days[0].blocks.map((b) => b.sortOrder)).toEqual([0, 1]);
    expect(result.days[2].blocks.map((b) => b.sortOrder)).toEqual([0, 1]);
  });

  it('leaves omitted optional fields blank rather than guessing', () => {
    const result = aiTripToDays(plan, days);
    const transfer = result.days[2].blocks[0];

    expect(transfer.content.from).toBeFalsy();
    expect(transfer.content.title).toBe('Transfer aeroporto');
  });
});
