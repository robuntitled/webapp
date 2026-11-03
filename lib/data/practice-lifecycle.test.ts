import { describe, expect, it } from 'vitest';
import { parseFlightStatus } from '@/lib/itineraries/bookings';

/**
 * Pure mapping for A8: cancelled/failed flights must demote practice status.
 * DB side effects covered via parse + status rules (supabase mocked elsewhere).
 */
function nextPracticeStatusOnFlight(
  current: 'draft' | 'confirmed' | 'preparing' | 'ready' | 'cancelled',
  providerStatus: string | null
): 'draft' | 'confirmed' | 'preparing' | 'ready' | 'cancelled' {
  const kind = parseFlightStatus(providerStatus);
  if (kind === 'confirmed') return 'confirmed';
  if (kind === 'failed' || kind === 'cancelled') {
    if (current === 'confirmed' || current === 'preparing' || current === 'ready') {
      return 'draft';
    }
  }
  return current;
}

function editionStatusAfterCounts(
  status: 'open' | 'formed' | 'locked' | 'closed',
  confirmed: number,
  min: number
): 'open' | 'formed' | 'locked' | 'closed' {
  if (status !== 'open' && status !== 'formed') return status;
  if (confirmed >= min) return 'formed';
  return 'open';
}

describe('practice flight lifecycle (A8)', () => {
  it('demotes preparing/ready to draft on cancelled flight', () => {
    expect(nextPracticeStatusOnFlight('preparing', 'CANCELLED')).toBe('draft');
    expect(nextPracticeStatusOnFlight('ready', 'FAILED')).toBe('draft');
    expect(nextPracticeStatusOnFlight('confirmed', 'CANCELLED')).toBe('draft');
    expect(nextPracticeStatusOnFlight('draft', 'PENDING_CONFIRMATION')).toBe('draft');
  });

  it('reopens formed edition when confirmed drop below min', () => {
    expect(editionStatusAfterCounts('formed', 3, 4)).toBe('open');
    expect(editionStatusAfterCounts('open', 4, 4)).toBe('formed');
    expect(editionStatusAfterCounts('formed', 5, 4)).toBe('formed');
  });
});
