import 'server-only';

import { getCachedValueAsync, setCachedValueAsync } from '@/lib/ai/cache';
import { getAiConfig, shouldUseExternalAi } from '@/lib/ai/config';
import { GeminiQuotaError } from '@/lib/ai/quota';
import { AiBudgetExceededError, generateStructured } from '@/lib/ai/provider';
import { estimateTypicalCallCostUsd } from '@/lib/ai/pricing';
import { canAffordAiCallAsync } from '@/lib/ai/budget';
import { logApiMetric } from '@/lib/api/metrics';
import { withTimeout } from '@/lib/utils/with-timeout';
import {
  aiTripToDays,
  buildTripGenerationPrompt,
} from '@/lib/composer/ai-trip-generator';
import {
  aiTripPlanSchema,
  normalizeAiTripPlan,
  type AiTripPlan,
} from '@/lib/composer/trip-schema';
import {
  applyStayBlocks,
  buildSmartDaySpecs,
  generateMockTrip,
  type MockTripContext,
} from '@/lib/composer/mock-trip-generator';
import {
  checkDestinationPlannable,
  resolveDestinationContext,
} from '@/lib/composer/destination-context';
import { enrichTripDays } from '@/lib/composer/trip-enrichment';
import { createEmptyBlock } from '@/lib/composer/blocks';
import { defaultOriginIata } from '@/lib/travel/origin-iata';
import type {
  ComposerGenerateSource,
  ComposerTripDayResult,
  ComposerTripGenerateRequest,
  ComposerTripGenerateResponse,
} from '@/types/composer';

const CONTRACT_VERSION = '1.1.0';
/** Un giro AI + enrichment: sopra questa soglia rispondiamo comunque smart. */
const TRIP_BUDGET_MS = 110_000;

export class VagueDestinationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VagueDestinationError';
  }
}

function tripContext(req: ComposerTripGenerateRequest): MockTripContext {
  const destination = resolveDestinationContext(req.destination, req.destinationMeta);
  return {
    req,
    destination,
    originIata: req.organizerOrigin?.iata?.toUpperCase() ?? defaultOriginIata(),
    originCity: req.organizerOrigin?.city,
    roundtrip: req.roundtrip !== false && req.days.length > 1,
  };
}

/** Struttura (senza prezzi) condivisa tra utenti: stessa meta/durata = 1 sola call. */
function tripCacheKey(ctx: MockTripContext): string {
  const { req, destination } = ctx;
  return [
    'shared-trip',
    destination.cityLabel.toLowerCase().slice(0, 60),
    req.days.length,
    req.planningMode,
    ctx.roundtrip ? 'rt' : 'ow',
    ctx.originIata,
  ].join(':');
}

type StructureResult = {
  tripTitle: string;
  days: ComposerTripDayResult[];
  source: ComposerGenerateSource;
  model: string;
  warnings: string[];
};

/** Riempie con blocchi smart i giorni che il modello ha saltato o lasciato vuoti. */
function fillMissingDays(
  days: ComposerTripDayResult[],
  ctx: MockTripContext
): { days: ComposerTripDayResult[]; filled: number } {
  const total = ctx.req.days.length;
  let filled = 0;

  const next = days.map((day) => {
    if (day.blocks.length >= 2) return day;
    const { title, specs } = buildSmartDaySpecs(ctx, day.dayIndex, total);
    filled += 1;
    return {
      ...day,
      suggestedTitle: day.blocks.length > 0 ? day.suggestedTitle : title,
      blocks: specs.map((spec, i) =>
        createEmptyBlock(spec.type, i, {
          title: spec.title,
          timeSlot: spec.timeSlot,
          ...spec.extra,
        })
      ),
    };
  });

  return { days: next, filled };
}

async function buildStructure(ctx: MockTripContext): Promise<StructureResult> {
  const warnings: string[] = [];
  const config = getAiConfig();
  const cacheKey = tripCacheKey(ctx);

  const cached = await getCachedValueAsync<AiTripPlan>(cacheKey);
  if (cached) {
    const mapped = aiTripToDays(cached, ctx.req.days);
    logApiMetric({ service: 'ai', op: 'generate-trip', source: 'cache' });
    return {
      ...mapped,
      source: 'cache',
      model: config.model,
      warnings: ['Struttura itinerario da cache condivisa (zero chiamate AI)'],
    };
  }

  const decision = await shouldUseExternalAi();

  if (decision.use) {
    const affordable = await canAffordAiCallAsync(
      estimateTypicalCallCostUsd(config.provider),
      config.monthlyBudgetUsd
    );

    if (!affordable) {
      warnings.push('Budget AI mensile raggiunto — itinerario smart');
    } else {
      try {
        const prompts = buildTripGenerationPrompt(ctx);
        const ai = await generateStructured<AiTripPlan>({
          schema: aiTripPlanSchema,
          systemPrompt: prompts.systemPrompt,
          userPrompt: prompts.userPrompt,
          responseSchema: prompts.responseSchema,
          jsonSuffix: prompts.jsonSuffix,
          // Un piano multi-giorno è molto più lungo di una singola giornata
          maxOutputTokens: Math.max(config.maxOutputTokens, 400 * ctx.req.days.length + 800),
          normalize: (raw) =>
            normalizeAiTripPlan(raw, {
              totalDays: ctx.req.days.length,
              cityLabel: ctx.destination.cityLabel,
              airportLabel: ctx.destination.airport?.label ?? null,
            }),
        });

        await setCachedValueAsync(cacheKey, ai.data, config.cacheTtlMs);
        logApiMetric({ service: 'ai', op: 'generate-trip', source: 'network' });

        const mapped = aiTripToDays(ai.data, ctx.req.days);
        return { ...mapped, source: 'ai', model: ai.model, warnings };
      } catch (error) {
        if (error instanceof GeminiQuotaError) {
          warnings.push(`${error.message} — itinerario smart`);
        } else if (error instanceof AiBudgetExceededError) {
          warnings.push('Budget AI mensile raggiunto — itinerario smart');
        } else {
          const message = error instanceof Error ? error.message : 'Errore AI';
          warnings.push(
            `AI non disponibile (${message.length > 110 ? `${message.slice(0, 107)}...` : message}) — itinerario smart`
          );
        }
      }
    }
  } else if (decision.reason && config.mode !== 'mock') {
    warnings.push(`${decision.reason} — itinerario smart`);
  }

  const mock = generateMockTrip(ctx);
  return { ...mock, source: 'mock', model: 'nomadlink-smart-v1', warnings };
}

function buildResponse(params: {
  tripTitle: string;
  days: ComposerTripDayResult[];
  source: ComposerGenerateSource;
  model: string;
  warnings: string[];
  startedAt: number;
  enrichment: ComposerTripGenerateResponse['meta']['enrichment'];
  quotes?: ComposerTripGenerateResponse['quotes'];
}): ComposerTripGenerateResponse {
  const blocksTotal = params.days.reduce((n, d) => n + d.blocks.length, 0);
  return {
    tripTitle: params.tripTitle,
    days: params.days,
    quotes: params.quotes,
    warnings: params.warnings,
    meta: {
      source: params.source,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - params.startedAt,
      model: params.model,
      version: CONTRACT_VERSION,
      daysFilled: params.days.filter((d) => d.blocks.length > 0).length,
      blocksTotal,
      enrichment: params.enrichment,
    },
  };
}

/** Itinerario completo smart senza attese esterne — usato come rete di sicurezza. */
export function buildEmergencyTripResponse(
  req: ComposerTripGenerateRequest,
  extraWarning?: string
): ComposerTripGenerateResponse {
  const ctx = tripContext(req);
  const mock = generateMockTrip(ctx);
  return buildResponse({
    tripTitle: mock.tripTitle,
    days: mock.days,
    source: 'mock',
    model: 'nomadlink-smart-v1',
    warnings: [
      extraWarning ?? 'Risposta rapida smart — server in timeout',
      'Itinerario generato localmente, senza tariffe live',
    ],
    startedAt: Date.now(),
    enrichment: { flights: false, hotels: false, activities: false, transfers: false },
  });
}

async function orchestrateTripInternal(
  req: ComposerTripGenerateRequest,
  onProgress?: (progress: { current: number; total: number; label: string }) => void
): Promise<ComposerTripGenerateResponse> {
  const startedAt = Date.now();
  const ctx = tripContext(req);
  const warnings: string[] = [];

  const check = checkDestinationPlannable(ctx.destination);
  if (!check.ok) {
    throw new VagueDestinationError(check.message);
  }
  if (check.warning) warnings.push(check.warning);

  const dayCount = req.days.length;
  const total = 3;
  onProgress?.({
    current: 1,
    total,
    label: `Costruisco ${dayCount} ${dayCount === 1 ? 'giornata' : 'giornate'} a ${ctx.destination.cityLabel}…`,
  });

  const structure = await buildStructure(ctx);
  warnings.push(...structure.warnings);

  const ready = structure.days.filter((d) => d.blocks.length >= 2).length;
  onProgress?.({
    current: 2,
    total,
    label:
      ready >= dayCount
        ? `${dayCount} giornate pronte — sistemo check-in e check-out…`
        : `Giorno ${Math.min(ready + 1, dayCount)} di ${dayCount} — completo le giornate mancanti…`,
  });

  const filledResult = fillMissingDays(structure.days, ctx);
  if (filledResult.filled > 0 && structure.source !== 'mock') {
    warnings.push(
      `${filledResult.filled} ${filledResult.filled === 1 ? 'giornata completata' : 'giornate completate'} con suggerimenti smart`
    );
  }

  const withStay = applyStayBlocks(filledResult.days, ctx);

  onProgress?.({ current: 3, total, label: 'Cerco voli, hotel e luoghi reali…' });

  const enriched = await enrichTripDays({
    days: withStay,
    destination: ctx.destination,
    originIata: ctx.originIata,
    originCity: ctx.originCity,
    startDate: req.startDate,
    endDate: req.endDate,
    roundtrip: ctx.roundtrip,
    adults: req.planningMode === 'group' ? Math.max(1, req.maxParticipants) : 1,
  });

  warnings.push(...enriched.warnings);

  return buildResponse({
    tripTitle: structure.tripTitle,
    days: enriched.days.map((day) => ({
      ...day,
      blocks: day.blocks.map((b, i) => ({ ...b, sortOrder: i })),
    })),
    source: structure.source,
    model: structure.model,
    warnings,
    startedAt,
    enrichment: enriched.enrichment,
    quotes: enriched.quotes.flight ? enriched.quotes : undefined,
  });
}

/**
 * Genera l'intero itinerario in un solo job: una call AI per la struttura,
 * poi enrichment parallelo con dati reali. Fallback smart sempre disponibile.
 */
export async function orchestrateTripGeneration(
  req: ComposerTripGenerateRequest,
  onProgress?: (progress: { current: number; total: number; label: string }) => void
): Promise<ComposerTripGenerateResponse> {
  return withTimeout(orchestrateTripInternal(req, onProgress), TRIP_BUDGET_MS, () =>
    buildEmergencyTripResponse(req, 'Timeout generazione — itinerario smart immediato')
  );
}
