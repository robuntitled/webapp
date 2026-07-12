import 'server-only';

import { getCachedValue, setCachedValue } from '@/lib/ai/cache';
import { getAiConfig, isAiComposerAvailable } from '@/lib/ai/config';
import { AiBudgetExceededError, generateStructured } from '@/lib/ai/provider';
import { estimateTypicalCallCostUsd } from '@/lib/ai/pricing';
import { canAffordAiCall } from '@/lib/ai/budget';
import {
  aiPlanToBlocks,
  aiDayPlanSchema,
  buildDayGenerationPrompt,
} from '@/lib/composer/ai-day-generator';
import { generateMockDayBlocks } from '@/lib/composer/mock-day-generator';
import { composerGenerateResponseSchema } from '@/lib/composer/generate-schemas';
import { applyQuotesToBlocks, fetchTravelQuotesForDay } from '@/lib/composer/travel-quotes';
import type {
  ComposerGenerateRequest,
  ComposerGenerateResponse,
  ComposerGenerateSource,
} from '@/types/composer';

const CONTRACT_VERSION = '1.0.0';

function totalDaysFromRange(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

type DayPlanResult = {
  suggestedTitle: string;
  blocks: ComposerGenerateResponse['blocks'];
  source: ComposerGenerateSource;
  model: string;
  warnings: string[];
};

function buildCacheKey(req: ComposerGenerateRequest, totalDays: number): string {
  const parts = [
    req.destination.toLowerCase(),
    String(req.dayIndex),
    String(totalDays),
    req.intent,
    req.planningMode,
    req.otherDaysSummary?.slice(0, 200) ?? '',
    req.targetBlockTypes?.join(',') ?? '',
  ];
  return `day-plan:${parts.join('|')}`;
}

async function generateDayPlan(
  req: ComposerGenerateRequest,
  totalDays: number
): Promise<DayPlanResult> {
  const warnings: string[] = [];
  const mockCtx = {
    destination: req.destination,
    destinationMeta: req.destinationMeta,
    dayIndex: req.dayIndex,
    totalDays,
    planningMode: req.planningMode,
  };

  const config = getAiConfig();
  const cacheKey = buildCacheKey(req, totalDays);

  if (isAiComposerAvailable()) {
    const cached = getCachedValue<{ suggestedTitle: string; blocks: ComposerGenerateResponse['blocks'] }>(
      cacheKey
    );
    if (cached) {
      return {
        suggestedTitle: cached.suggestedTitle,
        blocks: cached.blocks,
        source: 'cache',
        model: config.model,
        warnings: ['Itinerario da cache (risparmio token)'],
      };
    }

    if (!canAffordAiCall(estimateTypicalCallCostUsd(), config.monthlyBudgetUsd)) {
      warnings.push('Budget AI mensile raggiunto — suggerimenti mock');
    } else {
      try {
        const prompts = buildDayGenerationPrompt(req, totalDays);
        const ai = await generateStructured({
          schema: aiDayPlanSchema,
          responseSchema: prompts.responseSchema,
          systemPrompt: prompts.systemPrompt,
          userPrompt: prompts.userPrompt,
        });

        const mapped = aiPlanToBlocks(ai.data, req.targetBlockTypes);

        setCachedValue(
          cacheKey,
          { suggestedTitle: mapped.suggestedTitle, blocks: mapped.blocks },
          config.cacheTtlMs
        );

        return {
          suggestedTitle: mapped.suggestedTitle,
          blocks: mapped.blocks,
          source: 'ai',
          model: ai.model,
          warnings,
        };
      } catch (error) {
        if (error instanceof AiBudgetExceededError) {
          warnings.push('Budget AI mensile raggiunto — suggerimenti mock');
        } else {
          const message = error instanceof Error ? error.message : 'Errore AI';
          warnings.push(`AI non disponibile (${message}) — suggerimenti mock`);
        }
      }
    }
  }

  const mock = generateMockDayBlocks(mockCtx, req.targetBlockTypes);
  return {
    suggestedTitle: mock.suggestedTitle,
    blocks: mock.blocks,
    source: 'mock',
    model: 'nomadlink-mock-v1',
    warnings,
  };
}

/**
 * Orchestrator — Gemini 2.5 Flash con fallback mock + quote travel verificate.
 */
export async function orchestrateDayGeneration(
  req: ComposerGenerateRequest
): Promise<ComposerGenerateResponse> {
  const started = Date.now();
  const totalDays = totalDaysFromRange(req.startDate, req.endDate);

  const plan = await generateDayPlan(req, totalDays);
  const warnings = [...plan.warnings];

  const { quotes, warnings: travelWarnings } = await fetchTravelQuotesForDay({
    destination: req.destination,
    startDate: req.startDate,
    endDate: req.endDate,
    tripId: req.tripId,
  });

  warnings.push(...travelWarnings);

  let blocks = applyQuotesToBlocks(plan.blocks, quotes);

  if (req.intent === 'add_alternatives' && req.currentDayBlocks?.length) {
    const offset = req.currentDayBlocks.length;
    blocks = blocks.map((b, i) => ({ ...b, sortOrder: offset + i }));
    warnings.push('Blocchi aggiunti in coda al giorno esistente');
  }

  const response: ComposerGenerateResponse = {
    dayIndex: req.dayIndex,
    date: req.date,
    suggestedTitle: plan.suggestedTitle,
    blocks,
    quotes: quotes.flight || quotes.hotel ? quotes : undefined,
    warnings,
    meta: {
      source: plan.source,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      model: plan.model,
      version: CONTRACT_VERSION,
    },
  };

  const validated = composerGenerateResponseSchema.safeParse(response);
  if (validated.success) {
    return validated.data;
  }

  const mock = generateMockDayBlocks(
    {
      destination: req.destination,
      destinationMeta: req.destinationMeta,
      dayIndex: req.dayIndex,
      totalDays,
      planningMode: req.planningMode,
    },
    req.targetBlockTypes
  );

  const fallbackBlocks = applyQuotesToBlocks(mock.blocks, quotes);

  return {
    dayIndex: req.dayIndex,
    date: req.date,
    suggestedTitle: mock.suggestedTitle,
    blocks: fallbackBlocks,
    quotes: quotes.flight || quotes.hotel ? quotes : undefined,
    warnings: [
      ...warnings,
      `Validazione risposta fallita (${validated.error.issues[0]?.message ?? 'schema'}) — suggerimenti mock`,
    ],
    meta: {
      source: 'mock',
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      model: 'nomadlink-mock-v1',
      version: CONTRACT_VERSION,
    },
  };
}