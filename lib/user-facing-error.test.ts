import { describe, expect, it } from 'vitest';
import { toUserFacingError, userFacingErrorWithRef } from '@/lib/user-facing-error';

describe('toUserFacingError', () => {
  it('passes through safe Italian copy', () => {
    expect(toUserFacingError('Completa i dati dei passeggeri')).toBe(
      'Completa i dati dei passeggeri'
    );
  });

  it('strips provider / internal leaks', () => {
    expect(toUserFacingError('LiteAPI timeout on /flights')).toMatch(/Riprova/);
    expect(toUserFacingError('Duffel 401 Unauthorized')).toMatch(/Riprova/);
    expect(toUserFacingError('Applica la migration 032')).toMatch(/Riprova/);
  });

  it('attaches opaque ref', () => {
    expect(userFacingErrorWithRef('LiteAPI fail', 'F-BK-abc')).toMatch(/F-BK-abc/);
  });
});
