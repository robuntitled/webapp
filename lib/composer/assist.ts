import 'server-only';

import { getAiConfig, shouldUseExternalAi } from '@/lib/ai/config';
import type { ComposerDraft } from '@/types/composer';
import type { ComposerWizardStep } from '@/lib/composer/wizard-steps';
import type { PlannerProfile } from '@/types/planner';

export type AssistMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AssistRequest = {
  message: string;
  history?: AssistMessage[];
  draft: Partial<ComposerDraft>;
  step: ComposerWizardStep;
  plannerProfile?: PlannerProfile | null;
};

function summarizeDraft(draft: Partial<ComposerDraft>, step: ComposerWizardStep): string {
  const parts: string[] = [`Fase wizard: ${step}`];
  if (draft.destination) parts.push(`Destinazione: ${draft.destination}`);
  if (draft.startDate && draft.endDate) {
    parts.push(`Date: ${draft.startDate} → ${draft.endDate}`);
  }
  if (draft.days?.length) {
    const blocks = draft.days.reduce((n, d) => n + d.blocks.length, 0);
    parts.push(`${draft.days.length} giorni, ${blocks} blocchi`);
  }
  if (draft.planningMode) parts.push(`Modalità: ${draft.planningMode}`);
  if (draft.budgetHint) parts.push(`Budget indicativo: €${draft.budgetHint}`);
  if (draft.title) parts.push(`Titolo: ${draft.title}`);
  return parts.join('. ');
}

export function mockAssistReply(req: AssistRequest): string {
  const msg = req.message.toLowerCase().trim();
  const ctx = summarizeDraft(req.draft, req.step);

  if (/ciao|salve|hey|buongiorno/.test(msg)) {
    return `Ciao! Sono qui per aiutarti a costruire il viaggio. ${ctx ? `Stato attuale: ${ctx}.` : ''} Chiedimi idee per giornate, budget o cosa fare dopo.`;
  }

  if (/volo|voli|aeroporto|partenz/.test(msg)) {
    return 'I voli li aggiungi dopo la pubblicazione, nella sezione prenotazioni. Per ora concentrati sulle tappe giorno per giorno — la chat resta disponibile in ogni fase.';
  }

  if (/hotel|allogg|dormir/.test(msg)) {
    return 'Hotel e alloggi arrivano in un secondo momento, dopo aver composto l\'itinerario. Vuoi che ti suggerisca quartieri o zone da esplorare per i giorni?';
  }

  if (/budget|cost|spes|euro|€/.test(msg)) {
    const hint = req.draft.budgetHint ? `Hai indicato circa €${req.draft.budgetHint}. ` : '';
    return `${hint}Stima orientativa: considera trasporti locali, pasti e attività. Nella fase "Componi" vedi il budget stimato per persona nella barra in alto.`;
  }

  if (/giorn|day|itinerar|cosa fare|sugger/.test(msg)) {
    if (req.step === 'landing') {
      return 'Prima scegli destinazione e durata, poi nella fase Componi usa "Suggerisci giornata ✨" su ogni pagina. Posso anche rispondere a domande specifiche sulla destinazione.';
    }
    const dest = req.draft.destination || 'la destinazione';
    return `Per ${dest}: nella vista Componi tocca "Suggerisci giornata ✨" sul giorno attivo, oppure aggiungi tappe manualmente dalla palette. Dimmi quale giorno ti interessa e che stile preferisci (cultura, relax, avventura).`;
  }

  if (/pubblic|lanci|fin/.test(msg)) {
    return 'Quando hai almeno una tappa per giorno, vai su "Rivedi" e lancia il viaggio. Potrai invitare la crew e aggiungere voli/hotel dopo.';
  }

  if (/aiut|come funziona|cosa/.test(msg)) {
    return 'Il composer è in 3 passi: Inizio (meta e giorni) → Componi (una pagina per giorno) → Pubblica. La chat è sempre qui in basso a destra. Chiedimi qualsiasi cosa sul viaggio in corso.';
  }

  return `Ho capito. ${ctx ? `Contesto: ${ctx}. ` : ''}Puoi chiedermi idee per le giornate, chiarimenti sul flusso, o quando aggiungere voli e hotel.`;
}

async function callAssistAi(req: AssistRequest): Promise<string | null> {
  const { use } = shouldUseExternalAi();
  if (!use) return null;

  const config = getAiConfig();
  const context = summarizeDraft(req.draft, req.step);
  const history = (req.history ?? [])
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Utente' : 'Assistente'}: ${m.content}`)
    .join('\n');

  const system = `Sei l'assistente di NomadLink per creare viaggi di gruppo. Rispondi in italiano, massimo 4 frasi, tono amichevole e chiaro. Non inventare prezzi precisi. Voli/hotel si aggiungono dopo la pubblicazione. Contesto bozza: ${context}`;
  const user = [history, `Utente: ${req.message}`].filter(Boolean).join('\n\n');

  try {
    if (config.provider === 'gemini' && config.geminiApiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
        }),
        signal: AbortSignal.timeout(18_000),
      });
      const payload = await response.json();
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return text || null;
    }

    if (config.openaiApiKey || config.openaiBaseUrl) {
      const url = `${config.openaiBaseUrl.replace(/\/$/, '')}/chat/completions`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.openaiApiKey ? { Authorization: `Bearer ${config.openaiApiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.4,
          max_tokens: 400,
        }),
        signal: AbortSignal.timeout(18_000),
      });
      const payload = await response.json();
      return payload.choices?.[0]?.message?.content?.trim() || null;
    }
  } catch {
    return null;
  }

  return null;
}

export async function replyToAssist(req: AssistRequest): Promise<{
  reply: string;
  source: 'ai' | 'mock';
}> {
  const ai = await callAssistAi(req);
  if (ai) return { reply: ai, source: 'ai' };
  return { reply: mockAssistReply(req), source: 'mock' };
}