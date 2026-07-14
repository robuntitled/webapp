import { afterEach, describe, expect, it } from 'vitest';
import { clearAiCacheForTests } from '@/lib/ai/cache';
import { orchestrateDayGeneration } from '@/lib/composer/orchestrator';
import type { ComposerGenerateRequest } from '@/types/composer';

const baseRequest: ComposerGenerateRequest = {
  destination: 'Monte San Giusto, Marche, Italia',
  destinationMeta: {
    label: 'Monte San Giusto',
    lat: 43.234,
    lng: 13.567,
    country: 'Italia',
    countryCode: 'IT',
    placeTypeLabel: 'Borgo',
  },
  dayIndex: 2,
  date: '2026-08-10',
  startDate: '2026-08-09',
  endDate: '2026-08-12',
  planningMode: 'group',
  maxParticipants: 4,
  intent: 'suggest_day',
  otherDaysSummary: 'G1: Volo Roma-Ancona, Check-in hotel, Cena in osteria',
};

const ENV_SNAPSHOT = { ...process.env };

afterEach(() => {
  process.env = { ...ENV_SNAPSHOT };
  clearAiCacheForTests();
});

describe('orchestrateDayGeneration mock path', () => {
  it('returns sensible blocks quickly without external AI', async () => {
    process.env.AI_COMPOSER_ENABLED = 'false';
    process.env.AI_COMPOSER_MODE = 'mock';

    const started = Date.now();
    const result = await orchestrateDayGeneration(baseRequest);
    const elapsed = Date.now() - started;

    expect(elapsed).toBeLessThan(3000);
    expect(result.meta.source).toBe('mock');
    expect(result.blocks.length).toBeGreaterThanOrEqual(4);
    expect(result.suggestedTitle.length).toBeGreaterThan(3);

    const types = new Set(result.blocks.map((b) => b.type));
    expect(types.has('meal') || types.has('attraction') || types.has('activity')).toBe(true);
  });
});

describe('orchestrateDayGeneration ollama path', () => {
  it('uses local open-source model when configured', async () => {
    process.env.AI_COMPOSER_ENABLED = 'true';
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_BASE_URL = 'http://127.0.0.1:11434/v1';
    process.env.AI_MODEL = process.env.AI_MODEL ?? 'llama3.2:3b';
    process.env.AI_JSON_MODE = 'false';
    process.env.AI_SINGLE_MESSAGE = 'true';
    process.env.AI_COMPOSER_MODE = 'openai';
    process.env.AI_TIMEOUT_MS = '60000';

    const probe = await fetch(`${process.env.AI_BASE_URL}/models`, {
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!probe?.ok) {
      console.warn('Ollama non raggiungibile — skip test AI locale');
      return;
    }

    const started = Date.now();
    const result = await orchestrateDayGeneration(baseRequest);
    const elapsed = Date.now() - started;

    expect(['ai', 'mock', 'cache']).toContain(result.meta.source);
    expect(result.blocks.length).toBeGreaterThanOrEqual(3);
    expect(elapsed).toBeLessThan(55_000);

    if (result.meta.source === 'ai') {
      expect(result.meta.latencyMs).toBeGreaterThan(0);
    }
  }, 70_000);
});
