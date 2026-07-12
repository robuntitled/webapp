import 'server-only';

import { generateMockDayBlocks } from '@/lib/composer/mock-day-generator';
import { composerGenerateResponseSchema } from '@/lib/composer/generate-schemas';
import { applyQuotesToBlocks, fetchTravelQuotesForDay } from '@/lib/composer/travel-quotes';
import type {
  ComposerGenerateRequest,
  ComposerGenerateResponse,
} from '@/types/composer';

const CONTRACT_VERSION = '1.0.0';

function totalDaysFromRange(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

/**
 * Orchestrator MVP — mock creativo + quote travel verificate.
 * Sostituibile con LLM senza cambiare ComposerGenerateResponse.
 */
export async function orchestrateDayGeneration(
  req: ComposerGenerateRequest
): Promise<ComposerGenerateResponse> {
  const started = Date.now();
  const warnings: string[] = [];

  const totalDays = totalDaysFromRange(req.startDate, req.endDate);

  const { suggestedTitle, blocks: rawBlocks } = generateMockDayBlocks(
    {
      destination: req.destination,
      destinationMeta: req.destinationMeta,
      dayIndex: req.dayIndex,
      totalDays,
      planningMode: req.planningMode,
    },
    req.targetBlockTypes
  );

  const { quotes, warnings: travelWarnings } = await fetchTravelQuotesForDay({
    destination: req.destination,
    startDate: req.startDate,
    endDate: req.endDate,
    tripId: req.tripId,
  });

  warnings.push(...travelWarnings);

  let blocks = applyQuotesToBlocks(rawBlocks, quotes);

  if (req.intent === 'add_alternatives' && req.currentDayBlocks?.length) {
    const offset = req.currentDayBlocks.length;
    blocks = blocks.map((b, i) => ({ ...b, sortOrder: offset + i }));
    warnings.push('Blocchi aggiunti in coda al giorno esistente');
  }

  const response: ComposerGenerateResponse = {
    dayIndex: req.dayIndex,
    date: req.date,
    suggestedTitle,
    blocks,
    quotes: quotes.flight || quotes.hotel ? quotes : undefined,
    warnings,
    meta: {
      source: 'mock',
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      model: 'nomadlink-mock-v1',
      version: CONTRACT_VERSION,
    },
  };

  const validated = composerGenerateResponseSchema.safeParse(response);
  if (!validated.success) {
    throw new Error(`Risposta orchestrator non valida: ${validated.error.message}`);
  }

  return validated.data;
}