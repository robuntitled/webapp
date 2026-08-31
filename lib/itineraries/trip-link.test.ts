import { describe, expect, it } from 'vitest';
import { parseTripShareLink } from '@/lib/itineraries/trip-link';

describe('parseTripShareLink', () => {
  it('rejects empty input', () => {
    expect(parseTripShareLink('')).toEqual({ kind: 'invalid', reason: 'empty' });
  });

  it('parses partenze urls', () => {
    expect(
      parseTripShareLink('https://webapp-bice-six-42.vercel.app/partenze/11111111-1111-4111-8111-111111111111')
    ).toEqual({ kind: 'partenza', id: '11111111-1111-4111-8111-111111111111' });
  });

  it('parses invite tokens', () => {
    expect(parseTripShareLink('/invito/abc-token')).toEqual({
      kind: 'invito',
      token: 'abc-token',
    });
  });

  it('parses raw uuid as partenza', () => {
    expect(parseTripShareLink('11111111-1111-4111-8111-111111111111')).toEqual({
      kind: 'partenza',
      id: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('rejects unknown paths', () => {
    expect(parseTripShareLink('https://example.com/foo')).toEqual({
      kind: 'invalid',
      reason: 'unrecognized',
    });
  });
});
