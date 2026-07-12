import 'server-only';

import { getAiConfig } from '@/lib/ai/config';
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
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string; code?: number };
};

async function callGeminiModel<T>(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
  maxOutputTokens: number;
}): Promise<GeminiStructuredResult<T>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: params.maxOutputTokens,
        responseMimeType: 'application/json',
        responseSchema: params.responseSchema,
      },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as GeminiGenerateResponse;

  if (!response.ok) {
    const message = payload.error?.message ?? `Gemini HTTP ${response.status}`;
    throw new Error(message);
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini ha restituito una risposta vuota');
  }

  let data: T;
  try {
    data = JSON.parse(text) as T;
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
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore Gemini';
      lastError = error instanceof Error ? error : new Error(message);

      if (!isGeminiModelUnavailableError(message)) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error('Nessun modello Gemini disponibile');
}