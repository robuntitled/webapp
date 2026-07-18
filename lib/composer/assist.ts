import 'server-only';

import { canAffordAiCall, recordAiSpend } from '@/lib/ai/budget';
import { getCachedValue, setCachedValue } from '@/lib/ai/cache';
import { getAiConfig, shouldUseExternalAi } from '@/lib/ai/config';
import { pickGeminiAnswerText } from '@/lib/ai/json-extract';
import { estimateTypicalCallCostUsd } from '@/lib/ai/pricing';
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

/**
 * Output max ~80–120 parole ≈ 150–250 token.
 * Non serve 2k: con thinking disabilitato è solo un tetto, ma modelli a volte
 * riempiono di più se il limite è alto → 512 tiene le risposte brevi.
 */
const ASSIST_MAX_OUTPUT_TOKENS = 512;
/** Storia: meno turni + testo troncato = meno input token. */
const ASSIST_HISTORY_TURNS = 4;
const ASSIST_HISTORY_CHARS = 180;
/** Cache risposte AI uguali (stessa destinazione + domanda normalizzata). */
const ASSIST_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type GeminiAssistPart = { text?: string; thought?: boolean };
type GeminiAssistResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiAssistPart[] };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string };
};

function summarizeDraft(draft: Partial<ComposerDraft>, step: ComposerWizardStep): string {
  const parts: string[] = [`fase=${step}`];
  if (draft.destination) {
    parts.push(`dest=${String(draft.destination).slice(0, 60)}`);
  }
  if (draft.title) parts.push(`titolo=${String(draft.title).slice(0, 50)}`);
  if (draft.startDate && draft.endDate) {
    parts.push(`date=${draft.startDate}→${draft.endDate}`);
  }
  if (draft.days?.length) {
    const blocks = draft.days.reduce((n, d) => n + d.blocks.length, 0);
    parts.push(`giorni=${draft.days.length},tappe=${blocks}`);
  }
  if (draft.budgetHint) parts.push(`budget≈€${draft.budgetHint}`);
  return parts.join('; ');
}

/**
 * Intent a costo zero: FAQ / saluti → mock, zero token Gemini.
 * Domande sul viaggio/opinioni/idee → AI.
 */
export function isCheapAssistIntent(message: string): boolean {
  const msg = message.toLowerCase().trim();
  if (msg.length < 2) return true;

  // Saluti e small talk
  if (
    /^(ciao|salve|hey|hi|hello|buongiorno|buonasera|buonanotte|come stai|come va)[\s!?.…]*$/i.test(
      msg
    )
  ) {
    return true;
  }

  // FAQ prodotto (non serve un LLM)
  if (/^(come funziona|aiuto|help)[\s!?.…]*$/i.test(msg)) return true;
  if (/\b(come funziona|cosa faccio|che faccio dopo)\b/.test(msg) && msg.length < 80) {
    return true;
  }
  if (/\b(volo|voli|aeroporto)\b/.test(msg) && msg.length < 100) return true;
  if (/\b(pubblic|lanci|pubblica)\b/.test(msg) && msg.length < 80) return true;

  return false;
}

export function mockAssistReply(req: AssistRequest): string {
  const msg = req.message.toLowerCase().trim();
  const ctx = summarizeDraft(req.draft, req.step);
  const dest = req.draft.destination || 'la destinazione';
  const title = req.draft.title;

  if (/ciao|salve|hey|buongiorno|buonasera|hello|hi/.test(msg)) {
    const trip = title || dest;
    return `Ciao! Sono qui per aiutarti con ${trip ? `«${trip}»` : 'il viaggio'}. Chiedimi un parere sull’itinerario, idee per una giornata o cosa fare dopo.`;
  }

  if (/come stai|come va/.test(msg)) {
    return 'Tutto bene, grazie! Dimmi pure se vuoi un feedback sul piano o idee per le tappe.';
  }

  if (/volo|voli|aeroporto|partenz/.test(msg)) {
    return 'I voli li gestisci meglio in prenotazioni dopo la pubblicazione. Ora conviene chiudere tappe e hotel giorno per giorno.';
  }

  if (/hotel|allogg|dormir/.test(msg)) {
    return 'Per l’hotel usa «Hotel» nel composer: check-in 14:00 e check-out il giorno dopo. Posso consigliarti zone se mi dici il quartiere preferito.';
  }

  if (/budget|cost|spes|euro|€/.test(msg)) {
    const hint = req.draft.budgetHint ? `Hai indicato circa €${req.draft.budgetHint}. ` : '';
    return `${hint}Stima orientativa: trasporti locali, pasti e attività. Nella fase Componi vedi il budget stimato per persona.`;
  }

  if (/giorn|day|itinerar|cosa fare|sugger/.test(msg)) {
    if (req.step === 'landing') {
      return 'Prima scegli destinazione e durata, poi in Componi aggiungi tappe o chiedimi idee specifiche (es. «musei a Roma in mezza giornata»).';
    }
    return `Per ${dest}: aggiungi tappe con Aggiungi, oppure dimmi stile (cultura, food, relax) e ti propongo un ritmo di giornata.`;
  }

  if (/pubblic|lanci|fin/.test(msg)) {
    return 'Quando hai almeno qualche tappa, vai su Rivedi e lancia il viaggio. Poi puoi invitare la crew.';
  }

  if (/aiut|come funziona|cosa/.test(msg)) {
    return 'Composer in 3 passi: Inizio → Componi (mappa + tappe) → Pubblica. La chat è in basso a destra per idee e chiarimenti.';
  }

  return `Ok. ${ctx ? `Contesto: ${ctx}. ` : ''}Chiedimi un parere sul viaggio, idee per un giorno o chiarimenti sul flusso.`;
}

/** Rimuove scorie di reasoning / meta-prompt che a volte leakano in UI. */
export function cleanAssistReply(raw: string): string {
  let text = raw.trim();
  if (!text) return '';

  text = text.replace(/^\s*\*+\s*\*?Attempt\s+\d+[^\n]*\n?/gim, '');
  text = text.replace(/^\s*Attempt\s+\d+\s*\([^)]*\)\s*:?\s*/gim, '');
  text = text.replace(/^\s*\(Refining[^)]*\)\s*:?\s*/gim, '');

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

function normalizeAssistQuery(message: string): string {
  return message
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function assistCacheKey(req: AssistRequest): string {
  const dest = String(req.draft.destination ?? '')
    .toLowerCase()
    .slice(0, 40);
  const q = normalizeAssistQuery(req.message);
  return `assist:v1:${req.step}:${dest}:${q}`;
}

function compactHistory(history: AssistMessage[] | undefined): string {
  return (history ?? [])
    .slice(-ASSIST_HISTORY_TURNS)
    .map((m) => {
      const role = m.role === 'user' ? 'U' : 'A';
      const content = m.content.trim().replace(/\s+/g, ' ').slice(0, ASSIST_HISTORY_CHARS);
      return `${role}: ${content}`;
    })
    .join('\n');
}

function buildAssistSystem(context: string, profile?: PlannerProfile | null): string {
  const profileBits: string[] = [];
  if (profile) {
    const p = profile as Record<string, unknown>;
    if (typeof p.travelStyle === 'string') profileBits.push(`stile=${p.travelStyle}`);
    if (typeof p.pace === 'string') profileBits.push(`ritmo=${p.pace}`);
  }

  // Prompt corto = meno input token (costo maggiore di solito è l’input su chat ripetute)
  return [
    'Assistente viaggi NomadLink. IT, amichevole, utile.',
    'Risposta completa 2–5 frasi (max ~100 parole). Niente meta/thinking/Attempt.',
    'No prezzi precisi inventati.',
    `Bozza: ${context}`,
    profileBits.length ? `Profilo: ${profileBits.join(',')}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function recordUsage(payload: GeminiAssistResponse, provider: 'gemini' | 'openai') {
  const input = payload.usageMetadata?.promptTokenCount ?? 0;
  const output = payload.usageMetadata?.candidatesTokenCount ?? 0;
  if (input > 0 || output > 0) {
    recordAiSpend(input, output, provider);
  }
}

async function callAssistAi(req: AssistRequest): Promise<string | null> {
  const { use } = shouldUseExternalAi();
  if (!use) return null;

  const config = getAiConfig();
  if (!canAffordAiCall(estimateTypicalCallCostUsd(config.provider), config.monthlyBudgetUsd)) {
    return null;
  }

  // Cache hit → zero chiamata API
  const cacheKey = assistCacheKey(req);
  const cached = getCachedValue<string>(cacheKey);
  if (cached) return cached;

  const context = summarizeDraft(req.draft, req.step);
  const history = compactHistory(req.history);
  const system = buildAssistSystem(context, req.plannerProfile);
  const user = [history, `U: ${req.message.slice(0, 500)}`].filter(Boolean).join('\n');

  try {
    if (config.provider === 'gemini' && config.geminiApiKey) {
      const text = await callGeminiAssist({
        apiKey: config.geminiApiKey,
        model: config.model,
        system,
        user,
        withThinkingOff: true,
      });
      if (text) {
        setCachedValue(cacheKey, text, ASSIST_CACHE_TTL_MS);
        return text;
      }
      // Retry senza thinkingConfig se il modello lo rifiuta
      const fallback = await callGeminiAssist({
        apiKey: config.geminiApiKey,
        model: config.model,
        system,
        user,
        withThinkingOff: false,
      });
      if (fallback) setCachedValue(cacheKey, fallback, ASSIST_CACHE_TTL_MS);
      return fallback;
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
          temperature: 0.45,
          max_tokens: ASSIST_MAX_OUTPUT_TOKENS,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      if (!response.ok) return null;
      if (payload.usage) {
        recordAiSpend(
          payload.usage.prompt_tokens ?? 0,
          payload.usage.completion_tokens ?? 0,
          'openai'
        );
      }
      const text = cleanAssistReply(payload.choices?.[0]?.message?.content?.trim() || '');
      if (text) setCachedValue(cacheKey, text, ASSIST_CACHE_TTL_MS);
      return text || null;
    }
  } catch {
    return null;
  }

  return null;
}

async function callGeminiAssist(params: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  withThinkingOff: boolean;
}): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;
    const generationConfig: Record<string, unknown> = {
      temperature: 0.45,
      maxOutputTokens: ASSIST_MAX_OUTPUT_TOKENS,
    };
    if (params.withThinkingOff) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.system }] },
        contents: [{ role: 'user', parts: [{ text: params.user }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = (await response.json().catch(() => ({}))) as GeminiAssistResponse;
    if (!response.ok) {
      if (
        params.withThinkingOff &&
        typeof payload.error?.message === 'string' &&
        /thinking|unknown name|invalid/i.test(payload.error.message)
      ) {
        return null; // caller farà retry senza thinking
      }
      return null;
    }

    recordUsage(payload, 'gemini');
    const candidate = payload.candidates?.[0];
    const text = cleanAssistReply(pickGeminiAnswerText(candidate?.content?.parts));
    if (!text) return null;

    if (
      candidate?.finishReason === 'MAX_TOKENS' &&
      text.length < 40 &&
      !/[.!?…]$/.test(text)
    ) {
      return null;
    }

    return text;
  } catch {
    return null;
  }
}

export async function replyToAssist(req: AssistRequest): Promise<{
  reply: string;
  source: 'ai' | 'mock';
}> {
  // 1) Intent banali → mock (0 token)
  if (isCheapAssistIntent(req.message)) {
    return { reply: mockAssistReply(req), source: 'mock' };
  }

  // 2) Domande “vere” → AI (cache / Gemini)
  const ai = await callAssistAi(req);
  if (ai) return { reply: ai, source: 'ai' };

  // 3) Fallback mock
  return { reply: mockAssistReply(req), source: 'mock' };
}
