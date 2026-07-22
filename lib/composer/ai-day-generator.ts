import { createEmptyBlock } from '@/lib/composer/blocks';
import {
  aiDayPlanGeminiSchema,
  aiDayPlanSchema,
  type AiDayBlockSpec,
  type AiDayPlan,
} from '@/lib/composer/ai-day-schema';
import { DAY_PLAN_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { originsSummaryForPrompt } from '@/lib/composer/origins';
import { buildIntelPromptBlock, resolveDestinationIntel } from '@/lib/composer/destination-intel';
import { buildPlannerPromptBlock } from '@/lib/composer/planner-prompt';
import { defaultOriginIata } from '@/lib/travel/origin-iata';
import type { ComposerBlock, ComposerBlockType, ComposerGenerateRequest } from '@/types/composer';

function specToExtra(spec: AiDayBlockSpec): Record<string, unknown> {
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

export function aiPlanToBlocks(
  plan: AiDayPlan,
  targetBlockTypes?: ComposerBlockType[]
): { suggestedTitle: string; blocks: ComposerBlock[] } {
  const filtered = targetBlockTypes?.length
    ? plan.blocks.filter((b) => targetBlockTypes.includes(b.type))
    : plan.blocks;

  const blocks = filtered.map((spec, i) =>
    createEmptyBlock(spec.type, i, specToExtra(spec))
  );

  return { suggestedTitle: plan.suggestedTitle, blocks };
}

export function buildDayGenerationPrompt(
  req: ComposerGenerateRequest,
  totalDays: number
): { systemPrompt: string; userPrompt: string; responseSchema: Record<string, unknown> } {
  const destLabel = req.destinationMeta?.label ?? req.destination;
  const intel = resolveDestinationIntel(req.destination, req.destinationMeta);
  const intelBlock = buildIntelPromptBlock(intel, destLabel);

  const isFirst = req.dayIndex === 1;
  const isLast = req.dayIndex === totalDays;
  const dayPhase = isFirst ? 'ARRIVO' : isLast ? 'PARTENZA' : 'ESPLORAZIONE';

  const originIata = req.organizerOrigin?.iata ?? defaultOriginIata();
  const originsLine = originsSummaryForPrompt(req);
  const plannerLine = buildPlannerPromptBlock(req.plannerProfile);

  const lines = [
    `dest=${destLabel}${req.destinationMeta?.country ? ` (${req.destinationMeta.country})` : ''}`,
    `day=${req.dayIndex}/${totalDays} (${req.date}) fase=${dayPhase}`,
    `periodo=${req.startDate}→${req.endDate}`,
    `mode=${req.planningMode === 'group' ? `group:${req.maxParticipants}` : 'solo'}`,
    `origin=${req.organizerOrigin?.city ?? 'n/d'} IATA=${originIata}`,
    originsLine ? `crew=${originsLine}` : null,
    plannerLine ? `traveler=${plannerLine}` : null,
    `intel=${intelBlock.replace(/\n/g, ' | ')}`,
    req.dayTitle ? `titolo=${req.dayTitle}` : null,
    req.otherDaysSummary ? `altri_giorni=${req.otherDaysSummary}` : null,
    req.targetBlockTypes?.length ? `tipi=${req.targetBlockTypes.join(',')}` : null,
  ].filter(Boolean);

  return {
    systemPrompt: DAY_PLAN_SYSTEM_PROMPT,
    userPrompt: lines.join('\n'),
    responseSchema: aiDayPlanGeminiSchema as unknown as Record<string, unknown>,
  };
}

export { aiDayPlanSchema };
