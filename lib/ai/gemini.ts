import 'server-only';

import { getAiConfig } from '@/lib/ai/config';
import { parseJsonFromGeminiText, pickGeminiAnswerText } from '@/lib/ai/json-extract';
import { DAY_PLAN_JSON_SUFFIX } from '@/lib/ai/prompts';
import {
  GeminiQuotaError,
  getQuotaCooldownRemainingMs,
  handleGeminiQuotaFailure,
  isGeminiQuotaError,
} from '@/lib/ai/quota';
import { isGeminiModelUnavailableError, resolveGeminiModelCandidates } from '@/lib/ai/models';

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

const GEMINI_FETCH_TIMEOUT_MS = 6_000;

/**
 * Una sola chiamata Gemini — JSON via prompt, senza responseSchema
 * (evita errori "pattern" e riduce quota).
 */
async function callGeminiOnce<T>(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
}): Promise<GeminiStructuredResult<T>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;

  const userPrompt = `${params.userPrompt}\n\n${DAY_PLAN_JSON_SUFFIX}`;

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
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: params.maxOutputTokens,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini timeout');
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
  maxOutputTokens?: number;
}): Promise<GeminiStructuredResult<T>> {
  const cooldownMs = getQuotaCooldownRemainingMs();
  if (cooldownMs > 0) {
    throw new GeminiQuotaError(
      `Limite gratuito Gemini (~10 req/min). Riprova tra ${Math.ceil(cooldownMs / 1000)}s`,
      cooldownMs
    );
  }

  const config = getAiConfig();
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY non configurata');
  }

  const models = resolveGeminiModelCandidates(config.model).slice(0, 2);
  const maxOutputTokens = params.maxOutputTokens ?? config.maxOutputTokens;
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      return await callGeminiOnce<T>({
        apiKey,
        model,
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        maxOutputTokens,
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

      if (!isGeminiModelUnavailableError(message)) {
        break;
      }
    }
  }

  throw lastError ?? new Error('Gemini non disponibile');
}