import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  getAiConfig,
  isLocalAiBaseUrl,
  shouldUseExternalAi,
} from '@/lib/ai/config';
import { clearAiCacheForTests } from '@/lib/ai/cache';

const ENV_KEYS = [
  'AI_PROVIDER',
  'AI_COMPOSER_ENABLED',
  'AI_BASE_URL',
  'AI_MODEL',
  'AI_API_KEY',
  'AI_COMPOSER_MODE',
  'GEMINI_API_KEY',
] as const;

function saveEnv(): Record<string, string | undefined> {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe('getAiConfig openai provider', () => {
  const snapshot = saveEnv();

  afterEach(() => {
    restoreEnv(snapshot);
    clearAiCacheForTests();
  });

  it('defaults to local Ollama when provider is openai', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_COMPOSER_ENABLED = 'true';
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MODEL;

    const config = getAiConfig();
    expect(config.openaiBaseUrl).toBe(DEFAULT_OPENAI_BASE_URL);
    expect(config.model).toBe(DEFAULT_OPENAI_MODEL);
    expect(config.singleMessagePrompt).toBe(true);
    expect(config.jsonMode).toBe(false);
  });

  it('enables external AI for local Ollama without API key', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.AI_COMPOSER_ENABLED = 'true';
    process.env.AI_BASE_URL = 'http://localhost:11434/v1';
    process.env.AI_MODEL = 'llama3.2:3b';
    delete process.env.AI_API_KEY;

    expect((await shouldUseExternalAi()).use).toBe(true);
  });
});

describe('isLocalAiBaseUrl', () => {
  it('detects localhost endpoints', () => {
    expect(isLocalAiBaseUrl('http://localhost:11434/v1')).toBe(true);
    expect(isLocalAiBaseUrl('https://api.groq.com/openai/v1')).toBe(false);
  });
});
