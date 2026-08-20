import { describe, expect, it } from 'vitest';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { cashbackRateForRole, estimateCashbackEur } from '@/lib/commerce/cashback';

describe('cashback % removed', () => {
  it('does not expose percentage cashback in compliance copy', () => {
    expect(COMPLIANCE_COPY.pointsNoMoney).toMatch(/non hanno valore monetario/i);
    expect(COMPLIANCE_COPY.guide).not.toMatch(/%/);
  });

  it('does not credit percentage of booking value', () => {
    expect(cashbackRateForRole('creator')).toBe(0);
    expect(estimateCashbackEur(1000, 'participant')).toBe(0);
  });
});
