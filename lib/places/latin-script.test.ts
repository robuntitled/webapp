import { describe, expect, it } from 'vitest';
import { isLatinScriptText, placeUsesLatinScript } from '@/lib/places/latin-script';

describe('isLatinScriptText', () => {
  it('accepts Latin names with accents', () => {
    expect(isLatinScriptText('Paris')).toBe(true);
    expect(isLatinScriptText('São Paulo')).toBe(true);
    expect(isLatinScriptText('Île-de-France')).toBe(true);
    expect(isLatinScriptText('München')).toBe(true);
  });

  it('rejects non-Latin scripts', () => {
    expect(isLatinScriptText('東京')).toBe(false);
    expect(isLatinScriptText('Москва')).toBe(false);
    expect(isLatinScriptText('القاهرة')).toBe(false);
  });
});

describe('placeUsesLatinScript', () => {
  it('requires both label and subtitle to be Latin', () => {
    expect(placeUsesLatinScript('Tokyo', 'Giappone')).toBe(true);
    expect(placeUsesLatinScript('東京', 'Japan')).toBe(false);
  });
});