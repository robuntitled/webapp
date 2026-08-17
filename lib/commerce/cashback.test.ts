import { describe, expect, it } from 'vitest';
import {
  estimateParticipantCashbackEur,
  formatCreatorCashback,
  formatParticipantCashback,
} from '@/lib/commerce/cashback';

describe('cashback', () => {
  it('formats creator and participant rates from the flow architecture', () => {
    expect(formatCreatorCashback()).toBe('2%+');
    expect(formatParticipantCashback()).toBe('1,2–1,5%');
  });

  it('estimates mid-range cashback on trip price', () => {
    expect(estimateParticipantCashbackEur(1000)).toBe(14);
    expect(estimateParticipantCashbackEur(0)).toBe(0);
  });
});
