import { describe, expect, it } from 'vitest';
import {
  extractJsonPayload,
  parseJsonFromGeminiText,
  pickGeminiAnswerText,
} from '@/lib/ai/json-extract';

describe('pickGeminiAnswerText', () => {
  it('ignores thought parts and picks JSON answer', () => {
    const text = pickGeminiAnswerText([
      { thought: true, text: 'Analizzo la destinazione...' },
      {
        text: '{"suggestedTitle":"Giorno 1","blocks":[{"type":"meal","title":"Cena","timeSlot":"evening"}]}',
      },
    ]);

    expect(text.startsWith('{')).toBe(true);
    expect(text).toContain('suggestedTitle');
  });
});

describe('extractJsonPayload', () => {
  it('strips markdown fences', () => {
    const raw = '```json\n{"ok":true}\n```';
    expect(extractJsonPayload(raw)).toBe('{"ok":true}');
  });
});

describe('parseJsonFromGeminiText', () => {
  it('parses fenced JSON', () => {
    const parsed = parseJsonFromGeminiText<{ ok: boolean }>('```json\n{"ok":true}\n```');
    expect(parsed.ok).toBe(true);
  });
});