import 'server-only';

import { getAiConfig } from '@/lib/ai/config';
import { parseJsonFromGeminiText } from '@/lib/ai/json-extract';
import {
  DAY_PLAN_JSON_RETRY_SUFFIX,
  DAY_PLAN_JSON_SUFFIX,
} from '@/lib/ai/prompts';
import {
  getQuotaCooldownRemainingMsAsync,
  handleGeminiQuotaFailureAsync,
  isGeminiQuotaError,
} from '@/lib/ai/quota';

export type OpenAiUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type OpenAiStructuredResult<T> = {
  data: T;
  usage: OpenAiUsage;
  model: string;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string; type?: string };
};

function resolveTimeoutMs(baseUrl: string): number {
  const config = getAiConfig();
  if (config.requestTimeoutMs > 0) return config.requestTimeoutMs;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(baseUrl) ? 45_000 : 20_000;
}

function buildMessages(
  systemPrompt: string,
  userPrompt: string,
  retrySuffix?: string,
  jsonSuffix?: string
): Array<{ role: 'system' | 'user'; content: string }> {
  const config = getAiConfig();
  const userContent = [userPrompt, jsonSuffix ?? DAY_PLAN_JSON_SUFFIX, retrySuffix]
    .filter(Boolean)
    .join('\n\n');

  if (config.singleMessagePrompt) {
    return [
      {
        role: 'user',
        content: `${systemPrompt}\n\n${userContent}`,
      },
    ];
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}

async function callOpenAiCompatibleOnce<T>(params: {
  baseUrl: string;
  apiKey?: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
  retrySuffix?: string;
  jsonSuffix?: string;
}): Promise<OpenAiStructuredResult<T>> {
  const config = getAiConfig();
  const url = `${params.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const timeoutMs = resolveTimeoutMs(params.baseUrl);

  const body: Record<string, unknown> = {
    model: params.model,
    messages: buildMessages(
      params.systemPrompt,
      params.userPrompt,
      params.retrySuffix,
      params.jsonSuffix
    ),
    temperature: 0.2,
    max_tokens: params.maxOutputTokens,
    stream: false,
  };

  if (config.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (params.apiKey) {
    headers.Authorization = `Bearer ${params.apiKey}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`AI timeout (${Math.round(timeoutMs / 1000)}s)`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

  if (!response.ok) {
    const message = payload.error?.message ?? `AI HTTP ${response.status}`;
    if (isGeminiQuotaError(message) || response.status === 429) {
      throw await handleGeminiQuotaFailureAsync(message);
    }
    throw new Error(message);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Il modello ha restituito una risposta vuota');
  }

  let data: T;
  try {
    data = parseJsonFromGeminiText<T>(text);
  } catch {
    throw new Error('Il modello ha restituito JSON non valido');
  }

  return {
    data,
    usage: {
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
    },
    model: params.model,
  };
}

export async function generateOpenAiCompatibleStructured<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
  jsonSuffix?: string;
}): Promise<OpenAiStructuredResult<T>> {
  const cooldownMs = await getQuotaCooldownRemainingMsAsync();
  if (cooldownMs > 0) {
    throw new Error(
      `Limite API raggiunto. Riprova tra ${Math.ceil(cooldownMs / 1000)}s`
    );
  }

  const config = getAiConfig();
  const baseUrl = config.openaiBaseUrl;
  const model = config.model;
  const maxOutputTokens = params.maxOutputTokens ?? config.maxOutputTokens;

  let lastError: Error | null = null;

  for (const retrySuffix of [undefined, DAY_PLAN_JSON_RETRY_SUFFIX]) {
    try {
      return await callOpenAiCompatibleOnce<T>({
        baseUrl,
        apiKey: config.openaiApiKey,
        model,
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
        maxOutputTokens,
        retrySuffix,
        jsonSuffix: params.jsonSuffix,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore AI';
      lastError = error instanceof Error ? error : new Error(message);

      if (isGeminiQuotaError(message)) {
        throw await handleGeminiQuotaFailureAsync(message);
      }

      if (!message.includes('JSON non valido') && !message.includes('risposta vuota')) {
        break;
      }
    }
  }

  throw lastError ?? new Error('Provider AI non disponibile');
}
