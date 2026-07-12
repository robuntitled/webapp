import 'server-only';

import { getAiConfig } from '@/lib/ai/config';
import { parseJsonFromGeminiText, pickGeminiAnswerText } from '@/lib/ai/json-extract';
import {
  GeminiQuotaError,
  getQuotaCooldownRemainingMs,
  handleGeminiQuotaFailure,
  isGeminiQuotaError,
} from '@/lib/ai/quota';
import {
  isGeminiModelUnavailableError,
  isJsonOutputRetryableError,
  resolveGeminiModelCandidates,
} from '@/lib/ai/models';

export type GeminiUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type GeminiStructuredResult<T> = {
  data: T;
  usage: GeminiUsage;
  model: string;
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string; code?: number };
};

type GeminiCallParams = {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  responseSchema?: Record<string, unknown>;
  maxOutputTokens: number;
  format: 'legacySchema' | 'plain';
};

const GEMINI_FETCH_TIMEOUT_MS = 12_000;

function buildGenerationConfig(params: GeminiCallParams): Record<string, unknown> {
  const base: Record<string, unknown> = {
    temperature: 0.4,
    maxOutputTokens: params.maxOutputTokens,
  };

  if (params.format === 'legacySchema' && params.responseSchema) {
    return {
      ...base,
      responseMimeType: 'application/json',
      responseSchema: params.responseSchema,
    };
  }

  return base;
}

function buildUserPrompt(params: GeminiCallParams): string {
  if (params.format === 'plain') {
    return `${params.userPrompt}

Rispondi SOLO con un oggetto JSON valido (nessun markdown, nessun testo extra) con campi:
suggestedTitle (string), blocks (array di oggetti con type, title, timeSlot e campi opzionali place/description/duration/from/to/body/mode).`;
  }

  return params.userPrompt;
}

async function callGeminiModel<T>(params: GeminiCallParams): Promise<GeminiStructuredResult<T>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: buildUserPrompt(params) }] }],
        generationConfig: buildGenerationConfig(params),
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini timeout — richiesta troppo lenta');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => ({}))) as GeminiGenerateResponse;

  if (!response.ok) {
    const message = payload.error?.message ?? `Gemini HTTP ${response.status}`;
    if (isGeminiQuotaError(message) || response.status === 429) {
      throw handleGeminiQuotaFailure(message);
    }
    throw new Error(message);
  }

  const text = pickGeminiAnswerText(payload.candidates?.[0]?.content?.parts);
  if (!text) {
    throw new Error('Gemini ha restituito una risposta vuota');
  }

  let data: T;
  try {
    data = parseJsonFromGeminiText<T>(text);
  } catch {
    throw new Error('Gemini ha restituito JSON non valido');
  }

  return {
    data,
    usage: {
      inputTokens: payload.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
    },
    model: params.model,
  };
}

export async function generateGeminiStructured<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
  maxOutputTokens?: number;
}): Promise<GeminiStructuredResult<T>> {
  const cooldownMs = getQuotaCooldownRemainingMs();
  if (cooldownMs > 0) {
    throw new GeminiQuotaError(
      `Limite gratuito Gemini raggiunto (~10 richieste/min). Riprova tra ${Math.ceil(cooldownMs / 1000)}s`,
      cooldownMs
    );
  }

  const config = getAiConfig();
  const apiKey = config.geminiApiKey;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY non configurata');
  }

  const models = resolveGeminiModelCandidates(config.model);
  const maxOutputTokens = params.maxOutputTokens ?? config.maxOutputTokens;
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      return await callGeminiModel<T>({
        apiKey,
        model,
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        responseSchema: params.responseSchema,
        maxOutputTokens,
        format: 'legacySchema',
      });
    } catch (error) {
      if (error instanceof GeminiQuotaError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Errore Gemini';
      lastError = error instanceof Error ? error : new Error(message);

      if (isGeminiQuotaError(message)) {
        throw handleGeminiQuotaFailure(message);
      }

      if (isGeminiModelUnavailableError(message)) {
        continue;
      }

      if (isJsonOutputRetryableError(message)) {
        try {
          return await callGeminiModel<T>({
            apiKey,
            model,
            systemPrompt: params.systemPrompt,
            userPrompt: params.userPrompt,
            maxOutputTokens,
            format: 'plain',
          });
        } catch (plainError) {
          if (plainError instanceof GeminiQuotaError) {
            throw plainError;
          }
          const plainMessage = plainError instanceof Error ? plainError.message : 'Errore Gemini';
          if (isGeminiQuotaError(plainMessage)) {
            throw handleGeminiQuotaFailure(plainMessage);
          }
          lastError = plainError instanceof Error ? plainError : new Error(plainMessage);
        }
      }

      break;
    }
  }

  throw lastError ?? new Error('Nessun modello Gemini disponibile');
}