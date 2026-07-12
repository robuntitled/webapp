import { createEmptyBlock } from '@/lib/composer/blocks';
import {
  aiDayPlanGeminiSchema,
  aiDayPlanSchema,
  type AiDayBlockSpec,
  type AiDayPlan,
} from '@/lib/composer/ai-day-schema';
import type { ComposerBlock, ComposerBlockType, ComposerGenerateRequest } from '@/types/composer';

const SYSTEM_PROMPT = `Sei un travel planner per NomadLink. Rispondi SOLO con JSON valido secondo lo schema.
Regole:
- Scrivi titoli e descrizioni in italiano, concreti e locali per la destinazione.
- Usa luoghi plausibili (quartieri, mercati, esperienze tipiche) senza inventare nomi esatti di ristoranti.
- Rispetta la fascia oraria timeSlot per ogni blocco.
- Giorno 1: arrivo (volo verso aeroporto vicino, transfer, hotel, cena leggera).
- Ultimo giorno: partenza (colazione, transfer, volo ritorno).
- Giorni intermedi: mix attrazioni, pasti, attività, tempo libero.
- Per paesi/comuni piccoli in Italia: volo verso aeroporto reale vicino (es. Ancona AOI per Marche), NON verso il nome del paese.
- Evita di ripetere attività già presenti negli altri giorni indicati nel prompt.
- Massimo 8 blocchi, ordinati logicamente nella giornata.`;

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
  const country = req.destinationMeta?.country ? `, ${req.destinationMeta.country}` : '';
  const placeType = req.destinationMeta?.placeTypeLabel ?? req.destinationMeta?.placeType;

  const lines = [
    `Destinazione: ${destLabel}${country}`,
    placeType ? `Tipo luogo: ${placeType}` : null,
    `Giorno: ${req.dayIndex} di ${totalDays} (${req.date})`,
    `Modalità: ${req.planningMode === 'group' ? 'gruppo' : 'solo'} (${req.maxParticipants} partecipanti)`,
    `Intent: ${req.intent}`,
    req.dayTitle ? `Titolo giorno attuale: ${req.dayTitle}` : null,
    req.otherDaysSummary ? `Altri giorni già pianificati: ${req.otherDaysSummary}` : null,
    req.currentDayBlocks?.length
      ? `Blocchi già nel giorno: ${req.currentDayBlocks.map((b) => `${b.type}:${String(b.content.title ?? '')}`).join('; ')}`
      : null,
    req.targetBlockTypes?.length
      ? `Tipi blocchi richiesti: ${req.targetBlockTypes.join(', ')}`
      : null,
  ].filter(Boolean);

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: lines.join('\n'),
    responseSchema: aiDayPlanGeminiSchema as unknown as Record<string, unknown>,
  };
}

export { aiDayPlanSchema };