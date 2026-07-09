import { describe, expect, it } from 'vitest';
import { isMinimumAge, buildPrivacyConsentFields } from '@/lib/privacy/consent';
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy/constants';

describe('privacy consent', () => {
  it('verifica età minima', () => {
    const adult = new Date(2000, 0, 1);
    const child = new Date();
    child.setFullYear(child.getFullYear() - 10);
    expect(isMinimumAge(adult, 14)).toBe(true);
    expect(isMinimumAge(child, 14)).toBe(false);
  });

  it('genera campi consenso privacy con versione', () => {
    const fields = buildPrivacyConsentFields(true);
    expect(fields.privacy_consent).toBe(true);
    expect(fields.privacy_policy_version).toBe(PRIVACY_POLICY_VERSION);
    expect(fields.privacy_consent_at).toBeTruthy();
  });
});