import { createEmptyBlock } from '@/lib/composer/blocks';
import {
  aiDayPlanGeminiSchema,
  aiDayPlanSchema,
  type AiDayBlockSpec,
  type AiDayPlan,
} from '@/lib/composer/ai-day-schema';
import { originsSummaryForPrompt } from '@/lib/composer/origins';
import { buildIntelPromptBlock, resolveDestinationIntel } from '@/lib/composer/destination-intel';
import { defaultOriginIata } from '@/lib/travelpayouts/origin-iata';
import type { ComposerBlock, ComposerBlockType, ComposerGenerateRequest } from '@/types/composer';

const SYSTEM_PROMPT = `Sei un travel planner senior per NomadLink — stile guida locale insider, non turista generico.
Rispondi SOLO con JSON valido.

Qualità richiesta:
- Titoli vividi e specifici (max 80 caratteri), in italiano.
- Luoghi plausibili per la regione indicata; per borghi piccoli usa aeroporto/città vicina reale.
- Orari coerenti: colazione mattina, pranzo pomeriggio, cena sera.
- Giorno 1: arrivo (volo dall'aeroporto di partenza indicato → transfer → hotel → cena leggera → passeggiata).
- Ultimo giorno: colazione → ultimo highlight → transfer → volo ritorno verso aeroporto di partenza organizzatore.
- Usa i codici IATA di partenza forniti nel prompt; per gruppi con amici da altre città, aggiungi nota sync arrivi.
- Giorni intermedi: 5-7 blocchi vari (attrazioni, pasti, attività, tempo libero, nota crew).
- Evita ripetizioni con altri giorni elencati nel prompt.
- Non inventare nomi esatti di ristoranti commerciali; usa descrizioni ("osteria di paese", "friggitoria locale").
- Per gruppi: aggiungi nota con sync meet-up; per solo: promemoria pratico.`;

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

  const lines = [
    `=== VIAGGIO ===`,
    `Destinazione: ${destLabel}${req.destinationMeta?.country ? `, ${req.destinationMeta.country}` : ''}`,
    req.destinationMeta?.placeTypeLabel ? `Tipo: ${req.destinationMeta.placeTypeLabel}` : null,
    `Periodo: ${req.startDate} → ${req.endDate} (${totalDays} giorni)`,
    `Giorno richiesto: ${req.dayIndex} (${req.date}) — fase ${dayPhase}`,
    `Modalità: ${req.planningMode === 'group' ? `gruppo di ${req.maxParticipants}` : 'viaggio solo'}`,
    `Partenza organizzatore: ${req.organizerOrigin?.city ?? 'non specificata'} (IATA ${originIata})`,
    originsLine ? `Partenze gruppo: ${originsLine}` : null,
    ``,
    `=== CONTESTO LOCALE ===`,
    intelBlock,
    ``,
    req.dayTitle ? `Titolo giorno attuale: ${req.dayTitle}` : null,
    req.otherDaysSummary ? `Altri giorni (NON ripetere): ${req.otherDaysSummary}` : null,
    req.targetBlockTypes?.length ? `Tipi richiesti: ${req.targetBlockTypes.join(', ')}` : null,
  ].filter(Boolean);

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: lines.join('\n'),
    responseSchema: aiDayPlanGeminiSchema as unknown as Record<string, unknown>,
  };
}

export { aiDayPlanSchema };