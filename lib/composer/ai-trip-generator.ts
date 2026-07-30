import { createEmptyBlock } from '@/lib/composer/blocks';
import { TRIP_PLAN_JSON_SUFFIX, TRIP_PLAN_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { buildPlannerPromptBlock } from '@/lib/composer/planner-prompt';
import { buildIntelPromptBlock, resolveDestinationIntel } from '@/lib/composer/destination-intel';
import { originsSummaryForPrompt } from '@/lib/composer/origins';
import {
  aiTripPlanGeminiSchema,
  aiTripPlanSchema,
  normalizeAiTripPlan,
  type AiTripPlan,
} from '@/lib/composer/trip-schema';
import type { DestinationContext } from '@/lib/composer/destination-context';
import type {
  ComposerBlock,
  ComposerTripDayResult,
  ComposerTripGenerateRequest,
} from '@/types/composer';

export type TripPromptContext = {
  req: ComposerTripGenerateRequest;
  destination: DestinationContext;
  originIata: string;
  originCity?: string;
  roundtrip: boolean;
};

export function buildTripGenerationPrompt(ctx: TripPromptContext): {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
  jsonSuffix: string;
} {
  const { req, destination } = ctx;
  const totalDays = req.days.length;
  const intel = resolveDestinationIntel(req.destination, req.destinationMeta);
  const intelLine = buildIntelPromptBlock(intel, destination.cityLabel).replace(/\n/g, ' | ');
  const plannerLine = buildPlannerPromptBlock(req.plannerProfile);
  const crewLine = originsSummaryForPrompt(req);

  const dayLines = req.days
    .map((d) => {
      const phase =
        d.dayIndex === 1 ? 'ARRIVO' : d.dayIndex === totalDays ? 'PARTENZA' : 'ESPLORAZIONE';
      const hint = d.title ? ` titolo_utente="${d.title}"` : '';
      return `  giorno ${d.dayIndex} (${d.date}) fase=${phase}${hint}`;
    })
    .join('\n');

  const lines = [
    `destinazione=${destination.cityLabel}${destination.countryLabel ? `, ${destination.countryLabel}` : ''}`,
    destination.lat != null && destination.lng != null
      ? `coord=${destination.lat.toFixed(3)},${destination.lng.toFixed(3)}`
      : null,
    `airport=${destination.airport ? `${destination.airport.iata} (${destination.airport.label})` : 'sconosciuto'}`,
    `origin=${ctx.originCity ?? 'n/d'} IATA=${ctx.originIata}`,
    `periodo=${req.startDate}→${req.endDate} giorni=${totalDays}`,
    `return=${ctx.roundtrip ? 'si' : 'no'}`,
    `mode=${req.planningMode === 'group' ? `group:${req.maxParticipants}` : 'solo'}`,
    crewLine ? `crew=${crewLine}` : null,
    plannerLine ? `traveler=${plannerLine}` : null,
    `intel=${intelLine}`,
    'giorni_da_riempire:',
    dayLines,
    `Genera esattamente ${totalDays} oggetti in "days" con dayIndex da 1 a ${totalDays}.`,
  ].filter(Boolean);

  return {
    systemPrompt: TRIP_PLAN_SYSTEM_PROMPT,
    userPrompt: lines.join('\n'),
    responseSchema: aiTripPlanGeminiSchema as unknown as Record<string, unknown>,
    jsonSuffix: TRIP_PLAN_JSON_SUFFIX,
  };
}

function specToContent(spec: AiTripPlan['days'][number]['blocks'][number]) {
  const extra: Record<string, unknown> = { title: spec.title, timeSlot: spec.timeSlot };
  if (spec.place) extra.place = spec.place;
  if (spec.description) extra.description = spec.description;
  if (spec.duration) extra.duration = spec.duration;
  if (spec.from) extra.from = spec.from;
  if (spec.to) extra.to = spec.to;
  if (spec.body) extra.body = spec.body;
  if (spec.mode) extra.mode = spec.mode;
  return extra;
}

/** Converte il piano AI in giorni composer, mantenendo l'ordine delle date reali. */
export function aiTripToDays(
  plan: AiTripPlan,
  days: ComposerTripGenerateRequest['days']
): { tripTitle: string; days: ComposerTripDayResult[] } {
  const byIndex = new Map(plan.days.map((d) => [d.dayIndex, d]));

  const result: ComposerTripDayResult[] = days.map((day) => {
    const aiDay = byIndex.get(day.dayIndex);
    const blocks: ComposerBlock[] = (aiDay?.blocks ?? []).map((spec, i) =>
      createEmptyBlock(spec.type, i, specToContent(spec))
    );
    return {
      dayIndex: day.dayIndex,
      date: day.date,
      suggestedTitle: aiDay?.title ?? day.title ?? `Giorno ${day.dayIndex}`,
      blocks,
    };
  });

  return { tripTitle: plan.tripTitle, days: result };
}

export { aiTripPlanSchema, normalizeAiTripPlan };
