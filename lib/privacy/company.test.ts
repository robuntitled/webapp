import { describe, expect, it } from 'vitest';
import { LEGAL_PLACEHOLDERS } from '@/lib/privacy/company.defaults';

// Nota: getCompanyProfile() è server-only; testiamo i placeholder usati in assenza di .env
describe('company placeholders', () => {
  it('espone placeholder chiari per campi obbligatori', () => {
    expect(LEGAL_PLACEHOLDERS.companyName).toContain('da definire');
    expect(LEGAL_PLACEHOLDERS.vatId).toContain('da definire');
    expect(LEGAL_PLACEHOLDERS.addressLine).toContain('da definire');
  });

  it('ha valori di default per campi non obbligatori', () => {
    expect(LEGAL_PLACEHOLDERS.tradeName).toBe('Noivia');
    expect(LEGAL_PLACEHOLDERS.country).toBe('Italia');
    expect(LEGAL_PLACEHOLDERS.privacyEmail).toMatch(/Contatto in definizione/i);
    expect(LEGAL_PLACEHOLDERS.supportEmail).toMatch(/Contatto in definizione/i);
    expect(LEGAL_PLACEHOLDERS.privacyEmail).not.toMatch(/TODO|@|flygetr/i);
    expect(LEGAL_PLACEHOLDERS.supportEmail).not.toMatch(/TODO|@|flygetr/i);
  });
});