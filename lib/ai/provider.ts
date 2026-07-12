import 'server-only';

import type { ZodType } from 'zod';
import { canAffordAiCall, recordAiSpend } from '@/lib/ai/budget';
import { getAiConfig, isAiComposerAvailable } from '@/lib/ai/config';
import { generateGeminiStructured } from '@/lib/ai/gemini';
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

export async function generateStructured<T>(params: {
  schema: ZodType<T>;
  responseSchema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
}): Promise<StructuredGenerationResult<T>> {
  const config = getAiConfig();

  if (!isAiComposerAvailable()) {
    throw new Error('Provider AI non disponibile');
  }

  const estimatedCost = estimateTypicalCallCostUsd();
  if (!canAffordAiCall(estimatedCost, config.monthlyBudgetUsd)) {
    throw new AiBudgetExceededError();
  }

  const result = await generateGeminiStructured<T>({
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    responseSchema: params.responseSchema,
    maxOutputTokens: params.maxOutputTokens,
  });

  const normalized = normalizeAiDayPlan(result.data) ?? result.data;
  const parsed = params.schema.safeParse(normalized);
  if (!parsed.success) {
    const detail = parsed.error.issues[0]?.message ?? parsed.error.message;
    throw new Error(`Risposta AI non valida: ${detail}`);
  }

  const costUsd = recordAiSpend(result.usage.inputTokens, result.usage.outputTokens);

  return {
    data: parsed.data,
    model: result.model,
    usage: result.usage,
    costUsd,
  };
}