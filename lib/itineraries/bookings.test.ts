import { describe, expect, it } from 'vitest';
import {
  formatFlightBookingStatus,
  isFlightPendingConfirmation,
  parseFlightStatus,
} from '@/lib/itineraries/bookings';

describe('flight booking status', () => {
  it('treats PENDING_CONFIRMATION as pending', () => {
    expect(parseFlightStatus('PENDING_CONFIRMATION')).toBe('pending');
    expect(isFlightPendingConfirmation('PENDING_CONFIRMATION')).toBe(true);
  });

  it('formats pending copy for users', () => {
    const info = formatFlightBookingStatus('PENDING_CONFIRMATION');
    expect(info.label).toContain('Pagato');
    expect(info.description).toMatch(/compagnia/i);
  });

  it('treats CONFIRMED as confirmed', () => {
    expect(parseFlightStatus('CONFIRMED')).toBe('confirmed');
    expect(isFlightPendingConfirmation('CONFIRMED')).toBe(false);
  });
});
