import 'server-only';

import { getCachedValue, setCachedValue } from '@/lib/ai/cache';
import { getAiConfig, shouldUseExternalAi } from '@/lib/ai/config';
import { GeminiQuotaError } from '@/lib/ai/quota';
import { AiBudgetExceededError, generateStructured } from '@/lib/ai/provider';
import { estimateTypicalCallCostUsd } from '@/lib/ai/pricing';
import { canAffordAiCall } from '@/lib/ai/budget';
import { resolveOrchestratorBudgetMs } from '@/lib/ai/timeouts';
import { withTimeout } from '@/lib/utils/with-timeout';
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

function orchestratorBudgetMs(): number {
  return resolveOrchestratorBudgetMs(getAiConfig());
}

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

/** Cache condivisa tra utenti — stessa destinazione/giorno = 1 chiamata Gemini. */
function buildSharedCacheKey(req: ComposerGenerateRequest, totalDays: number): string {
  return `shared-day:${req.destination.toLowerCase().slice(0, 120)}:${req.dayIndex}:${totalDays}:${req.planningMode}`;
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
    organizerOrigin: req.organizerOrigin,
    crewOrigins: req.crewOrigins,
  };

  const config = getAiConfig();
  const cacheKey = buildSharedCacheKey(req, totalDays);

  const cached = getCachedValue<{ suggestedTitle: string; blocks: ComposerGenerateResponse['blocks'] }>(
    cacheKey
  );
  if (cached) {
    return {
      suggestedTitle: cached.suggestedTitle,
      blocks: cached.blocks,
      source: 'cache',
      model: config.model,
      warnings: ['Itinerario da cache condivisa (zero chiamate API)'],
    };
  }

  const geminiDecision = shouldUseExternalAi();

  if (geminiDecision.use) {
    if (!canAffordAiCall(estimateTypicalCallCostUsd(config.provider), config.monthlyBudgetUsd)) {
      warnings.push('Budget AI mensile raggiunto — suggerimenti smart');
    } else {
      try {
        const prompts = buildDayGenerationPrompt(req, totalDays);
        const ai = await generateStructured({
          schema: aiDayPlanSchema,
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
        if (error instanceof GeminiQuotaError) {
          warnings.push(`${error.message} — suggerimenti smart`);
        } else if (error instanceof AiBudgetExceededError) {
          warnings.push('Budget AI mensile raggiunto — suggerimenti smart');
        } else {
          const message = error instanceof Error ? error.message : 'Errore AI';
          const short =
            message.length > 120 ? `${message.slice(0, 117)}...` : message;
          warnings.push(`AI non disponibile (${short}) — suggerimenti smart`);
        }
      }
    }
  } else if (geminiDecision.reason && config.mode !== 'mock') {
    warnings.push(`${geminiDecision.reason} — suggerimenti smart`);
  }

  const mock = generateMockDayBlocks(mockCtx, req.targetBlockTypes);
  return {
    suggestedTitle: mock.suggestedTitle,
    blocks: mock.blocks,
    source: 'mock',
    model: 'nomadlink-smart-v1',
    warnings,
  };
}

export function buildEmergencyMockResponse(
  req: ComposerGenerateRequest,
  extraWarning?: string
): ComposerGenerateResponse {
  const totalDays = totalDaysFromRange(req.startDate, req.endDate);
  const mock = generateMockDayBlocks(
    {
      destination: req.destination,
      destinationMeta: req.destinationMeta,
      dayIndex: req.dayIndex,
      totalDays,
      planningMode: req.planningMode,
      organizerOrigin: req.organizerOrigin,
      crewOrigins: req.crewOrigins,
    },
    req.targetBlockTypes
  );

  const warnings = [
    extraWarning ?? 'Risposta rapida smart — server in timeout',
    'Itinerario generato localmente senza attesa API esterne',
  ];

  return {
    dayIndex: req.dayIndex,
    date: req.date,
    suggestedTitle: mock.suggestedTitle,
    blocks: mock.blocks,
    warnings,
    meta: {
      source: 'mock',
      generatedAt: new Date().toISOString(),
      latencyMs: 0,
      model: 'nomadlink-smart-v1',
      version: CONTRACT_VERSION,
    },
  };
}

async function orchestrateDayGenerationInternal(
  req: ComposerGenerateRequest
): Promise<ComposerGenerateResponse> {
  const started = Date.now();
  const totalDays = totalDaysFromRange(req.startDate, req.endDate);

  const [plan, quotesResult] = await Promise.all([
    generateDayPlan(req, totalDays),
    fetchTravelQuotesForDay({
      destination: req.destination,
      startDate: req.startDate,
      endDate: req.endDate,
      tripId: req.tripId,
      organizerOrigin: req.organizerOrigin,
      crewOrigins: req.crewOrigins,
    }),
  ]);

  const warnings = [...plan.warnings, ...quotesResult.warnings];
  let blocks = applyQuotesToBlocks(plan.blocks, quotesResult.quotes);

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
    quotes:
      quotesResult.quotes.flight || quotesResult.quotes.hotel
        ? quotesResult.quotes
        : undefined,
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

  return buildEmergencyMockResponse(
    req,
    `Validazione fallita (${validated.error.issues[0]?.message ?? 'schema'})`
  );
}

/**
 * Orchestrator — smart mock sempre disponibile, Gemini opzionale (1 call, cache condivisa).
 */
export async function orchestrateDayGeneration(
  req: ComposerGenerateRequest
): Promise<ComposerGenerateResponse> {
  return withTimeout(
    orchestrateDayGenerationInternal(req),
    orchestratorBudgetMs(),
    () => buildEmergencyMockResponse(req, 'Timeout server — risposta smart immediata')
  );
}