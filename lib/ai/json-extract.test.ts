import { describe, expect, it } from 'vitest';
import {
  closeTruncatedJson,
  extractJsonPayload,
  parseJsonFromGeminiText,
  pickGeminiAnswerText,
  repairJsonPayload,
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

describe('repairJsonPayload', () => {
  it('fixes invalid optional keys copied from old prompt', () => {
    const raw =
      '{"suggestedTitle":"Test","blocks":[{"type":"meal","title":"Cena","timeSlot":"evening","place?":"Centro"}]}';
    const repaired = repairJsonPayload(raw);
    expect(repaired).toContain('"place":"Centro"');
    expect(() => JSON.parse(repaired)).not.toThrow();
  });

  it('closes truncated JSON', () => {
    const truncated =
      '{"suggestedTitle":"Test","blocks":[{"type":"meal","title":"Cena","timeSlot":"evening"';
    const closed = closeTruncatedJson(truncated);
    expect(() => JSON.parse(closed)).not.toThrow();
  });
});

describe('parseJsonFromGeminiText', () => {
  it('parses fenced JSON', () => {
    const parsed = parseJsonFromGeminiText<{ ok: boolean }>('```json\n{"ok":true}\n```');
    expect(parsed.ok).toBe(true);
  });

  it('repairs trailing commas', () => {
    const parsed = parseJsonFromGeminiText<{ blocks: unknown[] }>(
      '{"suggestedTitle":"X","blocks":[{"type":"meal","title":"A","timeSlot":"evening"},]}'
    );
    expect(parsed.blocks).toHaveLength(1);
  });
});