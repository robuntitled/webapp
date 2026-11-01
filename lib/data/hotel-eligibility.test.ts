import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/data/practices', () => ({
  getPractice: vi.fn(),
}));
vi.mock('@/lib/data/trip-commitments', () => ({
  tripAllowsHotelBooking: vi.fn(),
}));

import { getPractice } from '@/lib/data/practices';
import { tripAllowsHotelBooking } from '@/lib/data/trip-commitments';
import {
  checkHotelEligibility,
  HOTEL_ELIGIBILITY_DENIED_MESSAGE,
} from '@/lib/data/hotel-eligibility';

const getPracticeMock = vi.mocked(getPractice);
const tripAllowsMock = vi.mocked(tripAllowsHotelBooking);

describe('checkHotelEligibility', () => {
  beforeEach(() => {
    getPracticeMock.mockReset();
    tripAllowsMock.mockReset();
  });

  it('allows when no practice/trip and when solo practice', async () => {
    expect(await checkHotelEligibility({ userId: 'u1' })).toEqual({ ok: true });
    getPracticeMock.mockResolvedValue({
      id: 'p1',
      mode: 'solo',
      status: 'draft',
    } as never);
    expect(
      await checkHotelEligibility({ userId: 'u1', practiceId: 'p1' })
    ).toEqual({ ok: true });
  });

  it('denies draft group practice', async () => {
    getPracticeMock.mockResolvedValue({
      id: 'p1',
      mode: 'group',
      status: 'draft',
    } as never);
    const r = await checkHotelEligibility({ userId: 'u1', practiceId: 'p1' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe('group_draft');
      expect(r.message).toBe(HOTEL_ELIGIBILITY_DENIED_MESSAGE);
      expect(r.message).not.toMatch(/soglia/i);
    }
  });

  it('denies foreign / missing practice', async () => {
    getPracticeMock.mockResolvedValue(null);
    const r = await checkHotelEligibility({ userId: 'u1', practiceId: 'p-x' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('practice_not_found');
  });

  it('denies trip when threshold not met', async () => {
    tripAllowsMock.mockResolvedValue(false);
    const r = await checkHotelEligibility({ userId: 'u1', tripId: 't1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('trip_not_allowed');
  });

  it('allows confirmed group practice', async () => {
    getPracticeMock.mockResolvedValue({
      id: 'p1',
      mode: 'group',
      status: 'confirmed',
    } as never);
    expect(
      await checkHotelEligibility({ userId: 'u1', practiceId: 'p1' })
    ).toEqual({ ok: true });
  });
});
