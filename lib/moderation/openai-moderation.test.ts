import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('moderatePostContent', () => {
  it('skips in development when no API key', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('OPENAI_MODERATION_API_KEY', '');
    vi.stubEnv('AI_API_KEY', '');
    const { moderatePostContent } = await import('./openai-moderation');
    const res = await moderatePostContent({ text: 'ciao viaggio' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.skipped).toBe(true);
  });

  it('blocks when OpenAI flags content', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              flagged: true,
              categories: { hate: true, violence: false },
            },
          ],
        }),
      })
    );
    const { moderatePostContent } = await import('./openai-moderation');
    const res = await moderatePostContent({ text: 'test' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/linee guida/i);
      expect(res.categories).toContain('hate');
    }
  });
});
