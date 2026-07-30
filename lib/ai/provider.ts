import 'server-only';

import type { ZodType } from 'zod';
import { canAffordAiCallAsync, recordAiSpendAsync } from '@/lib/ai/budget';
import { getAiConfig, isAiComposerConfigured } from '@/lib/ai/config';
import { generateGeminiStructured } from '@/lib/ai/gemini';
import { generateOpenAiCompatibleStructured } from '@/lib/ai/openai-compatible';
import { estimateTypicalCallCostUsd } from '@/lib/ai/pricing';
import { normalizeAiDayPlan } from '@/lib/composer/ai-day-normalize';

export type StructuredGenerationResult<T> = {
  data: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  costUsd: number;
};

export class AiBudgetExceededError extends Error {
  constructor() {
    super('Budget AI mensile raggiunto');
    this.name = 'AiBudgetExceededError';
  }
}

type ProviderCallParams = {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
  responseSchema?: Record<string, unknown>;
  jsonSuffix?: string;
};

async function callProvider<T>(params: ProviderCallParams): Promise<{
  data: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}> {
  const config = getAiConfig();

  if (config.provider === 'openai') {
    const result = await generateOpenAiCompatibleStructured<T>({
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      maxOutputTokens: params.maxOutputTokens,
      jsonSuffix: params.jsonSuffix,
    });
    return result;
  }

  const result = await generateGeminiStructured<T>(params);
  return result;
}

export async function generateStructured<T>(params: {
  schema: ZodType<T>;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
  /** JSON Schema provider-side (Gemini structured output). */
  responseSchema?: Record<string, unknown>;
  /** Esempio JSON appeso al prompt utente. */
  jsonSuffix?: string;
  /** Normalizzatore alternativo al piano-giornata (default). */
  normalize?: (raw: unknown) => unknown;
}): Promise<StructuredGenerationResult<T>> {
  const config = getAiConfig();

  if (!isAiComposerConfigured()) {
    throw new Error('Provider AI non configurato');
  }

  const estimatedCost = estimateTypicalCallCostUsd(config.provider);
  if (!(await canAffordAiCallAsync(estimatedCost, config.monthlyBudgetUsd))) {
    throw new AiBudgetExceededError();
  }

  const result = await callProvider<T>({
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    maxOutputTokens: params.maxOutputTokens,
    responseSchema: params.responseSchema,
    jsonSuffix: params.jsonSuffix,
  });

  const normalized = params.normalize
    ? (params.normalize(result.data) ?? result.data)
    : (normalizeAiDayPlan(result.data) ?? result.data);
  let parsed = params.schema.safeParse(normalized);
  if (!parsed.success && normalized !== result.data) {
    parsed = params.schema.safeParse(result.data);
  }
  if (!parsed.success) {
    const detail = parsed.error.issues[0]?.message ?? parsed.error.message;
    throw new Error(`Risposta AI non valida: ${detail}`);
  }

  const costUsd = await recordAiSpendAsync(
    result.usage.inputTokens,
    result.usage.outputTokens,
    config.provider
  );

  return {
    data: parsed.data,
    model: result.model,
    usage: result.usage,
    costUsd,
  };
}
