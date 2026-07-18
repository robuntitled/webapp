import 'server-only';

import { getAiConfig, shouldUseExternalAi } from '@/lib/ai/config';
import { pickGeminiAnswerText } from '@/lib/ai/json-extract';
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

/** Output budget assist: include margine se il modello “pensa” (thinking tokens). */
const ASSIST_MAX_OUTPUT_TOKENS = 2048;

type GeminiAssistPart = { text?: string; thought?: boolean };
type GeminiAssistResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiAssistPart[] };
    finishReason?: string;
  }>;
  error?: { message?: string };
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

/** Rimuove scorie di reasoning / meta-prompt che a volte leakano in UI. */
export function cleanAssistReply(raw: string): string {
  let text = raw.trim();
  if (!text) return '';

  // Blocchi tipo "* *Attempt 2…*" o "Attempt N (...):"
  text = text.replace(/^\s*\*+\s*\*?Attempt\s+\d+[^\n]*\n?/gim, '');
  text = text.replace(/^\s*Attempt\s+\d+\s*\([^)]*\)\s*:?\s*/gim, '');
  text = text.replace(/^\s*\(Refining[^)]*\)\s*:?\s*/gim, '');

  // Righe meta esplicite
  text = text
    .split('\n')
    .filter((line) => {
      const l = line.trim().toLowerCase();
      if (!l) return true;
      if (/^attempt\s+\d+/.test(l)) return false;
      if (/refining and counting/.test(l)) return false;
      if (/counting sentences/.test(l)) return false;
      if (/^thinking:/.test(l)) return false;
      return true;
    })
    .join('\n')
    .trim();

  return text;
}

function buildAssistSystem(context: string, profile?: PlannerProfile | null): string {
  const profileBits: string[] = [];
  if (profile) {
    // Campi tipici opzionali — non fallire se assenti
    const p = profile as Record<string, unknown>;
    if (typeof p.travelStyle === 'string') profileBits.push(`stile: ${p.travelStyle}`);
    if (typeof p.pace === 'string') profileBits.push(`ritmo: ${p.pace}`);
  }

  return [
    'Sei l\'assistente di viaggio di NomadLink (viaggi di gruppo).',
    'Rispondi SEMPRE in italiano, tono amichevole e chiaro.',
    'Scrivi una risposta completa e naturale (circa 40–120 parole). Non troncare a metà frase.',
    'Non contare le frasi, non mostrare ragionamenti interni, tentativi o meta-commenti (niente "Attempt", "Refining", "Thinking").',
    'Non inventare prezzi precisi. Voli e hotel si affinano nel piano; puoi dare consigli di zona e orari.',
    `Contesto bozza: ${context}`,
    profileBits.length ? `Profilo: ${profileBits.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' ');
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

  const system = buildAssistSystem(context, req.plannerProfile);
  const user = [history, `Utente: ${req.message}`, 'Rispondi solo all\'utente, con il testo finale.'].filter(Boolean).join('\n\n');

  try {
    if (config.provider === 'gemini' && config.geminiApiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: ASSIST_MAX_OUTPUT_TOKENS,
            // Gemini 2.5/3.x: riduce token “thinking” che mangiavano l’output (troncature)
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(25_000),
      });
      const payload = (await response.json().catch(() => ({}))) as GeminiAssistResponse;
      if (!response.ok) {
        // Se thinkingConfig non è supportato su qualche modello, riprova senza
        if (
          typeof payload.error?.message === 'string' &&
          /thinking|unknown name|invalid/i.test(payload.error.message)
        ) {
          return callGeminiAssistSimple({
            apiKey: config.geminiApiKey,
            model: config.model,
            system,
            user,
          });
        }
        return null;
      }

      const candidate = payload.candidates?.[0];
      const text = cleanAssistReply(pickGeminiAnswerText(candidate?.content?.parts));
      if (!text) return null;

      // Se troncato per MAX_TOKENS e testo corto/incompleto, non mostrare spezzatura brutta
      if (
        candidate?.finishReason === 'MAX_TOKENS' &&
        text.length < 40 &&
        !/[.!?…]$/.test(text)
      ) {
        return null;
      }

      return text;
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
          temperature: 0.5,
          max_tokens: ASSIST_MAX_OUTPUT_TOKENS,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = cleanAssistReply(payload.choices?.[0]?.message?.content?.trim() || '');
      return text || null;
    }
  } catch {
    return null;
  }

  return null;
}

/** Fallback se thinkingConfig non è accettato dal modello. */
async function callGeminiAssistSimple(params: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.system }] },
        contents: [{ role: 'user', parts: [{ text: params.user }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: ASSIST_MAX_OUTPUT_TOKENS,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const payload = (await response.json().catch(() => ({}))) as GeminiAssistResponse;
    if (!response.ok) return null;
    return cleanAssistReply(pickGeminiAnswerText(payload.candidates?.[0]?.content?.parts)) || null;
  } catch {
    return null;
  }
}

export async function replyToAssist(req: AssistRequest): Promise<{
  reply: string;
  source: 'ai' | 'mock';
}> {
  const ai = await callAssistAi(req);
  if (ai) return { reply: ai, source: 'ai' };
  return { reply: mockAssistReply(req), source: 'mock' };
}
