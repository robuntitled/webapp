import { describe, expect, it } from 'vitest';
import { aiPlanToBlocks, buildDayGenerationPrompt } from '@/lib/composer/ai-day-generator';
import type { ComposerGenerateRequest } from '@/types/composer';

const baseRequest: ComposerGenerateRequest = {
  destination: 'Bangkok, Thailandia',
  destinationMeta: {
    label: 'Bangkok',
    lat: 13.7563,
    lng: 100.5018,
    country: 'Thailandia',
    placeTypeLabel: 'Città',
  },
  dayIndex: 3,
  date: '2026-08-10',
  startDate: '2026-08-08',
  endDate: '2026-08-14',
  planningMode: 'group',
  maxParticipants: 4,
  intent: 'suggest_day',
  otherDaysSummary: 'G1: volo, hotel; G2: tempio, street food',
};

describe('buildDayGenerationPrompt', () => {
  it('includes destination and anti-repetition context', () => {
    const { userPrompt } = buildDayGenerationPrompt(baseRequest, 7);

    expect(userPrompt).toContain('Bangkok');
    expect(userPrompt).toContain('Giorno richiesto: 3');
    expect(userPrompt).toContain('CONTESTO LOCALE');
    expect(userPrompt).toContain('Altri giorni (NON ripetere)');
  });
});

describe('aiPlanToBlocks', () => {
  it('maps AI specs to composer blocks', () => {
    const { suggestedTitle, blocks } = aiPlanToBlocks({
      suggestedTitle: 'Esplorazione Bangkok',
      blocks: [
        { type: 'attraction', title: 'Wat Pho', timeSlot: 'morning', place: 'Wat Pho', duration: '2h' },
        { type: 'meal', title: 'Street food', timeSlot: 'afternoon', place: 'Yaowarat' },
        { type: 'activity', title: 'Tour barca', timeSlot: 'evening', description: 'Canali storici' },
      ],
    });

    expect(suggestedTitle).toBe('Esplorazione Bangkok');
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('attraction');
    expect(blocks[0].content.title).toBe('Wat Pho');
    expect(blocks[0].content.place).toBe('Wat Pho');
  });

  it('filters by target block types when provided', () => {
    const { blocks } = aiPlanToBlocks(
      {
        suggestedTitle: 'Test',
        blocks: [
          { type: 'flight', title: 'Volo', timeSlot: 'morning' },
          { type: 'meal', title: 'Pranzo', timeSlot: 'afternoon' },
        ],
      },
      ['meal']
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('meal');
  });
});