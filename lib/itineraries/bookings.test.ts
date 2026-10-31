import { describe, expect, it } from 'vitest';
import {
  flightStatusConfirmsSeat,
  formatFlightBookingStatus,
  isFlightPendingConfirmation,
  parseFlightStatus,
} from '@/lib/itineraries/bookings';

describe('flight booking status', () => {
  it('treats PENDING_CONFIRMATION as pending', () => {
    expect(parseFlightStatus('PENDING_CONFIRMATION')).toBe('pending');
    expect(isFlightPendingConfirmation('PENDING_CONFIRMATION')).toBe(true);
  });

  it('maps pending aliases (CREATED, PENDING)', () => {
    expect(parseFlightStatus('CREATED')).toBe('pending');
    expect(parseFlightStatus('PENDING')).toBe('pending');
    expect(isFlightPendingConfirmation('CREATED')).toBe(true);
  });

  it('formats pending copy for users', () => {
    const info = formatFlightBookingStatus('PENDING_CONFIRMATION');
    expect(info.label).toContain('Pagato');
    expect(info.description).toMatch(/compagnia/i);
  });

  it('treats CONFIRMED and TICKETED as confirmed', () => {
    expect(parseFlightStatus('CONFIRMED')).toBe('confirmed');
    expect(parseFlightStatus('TICKETED')).toBe('confirmed');
    expect(isFlightPendingConfirmation('CONFIRMED')).toBe(false);
  });

  it('maps FAILED and EXPIRED as failed (never confirmed)', () => {
    expect(parseFlightStatus('FAILED')).toBe('failed');
    expect(parseFlightStatus('EXPIRED')).toBe('failed');
    expect(parseFlightStatus('FAILED')).not.toBe('confirmed');
  });

  it('maps CANCELLED variants as cancelled (never confirmed)', () => {
    expect(parseFlightStatus('CANCELLED')).toBe('cancelled');
    expect(parseFlightStatus('CANCELLED_WITH_CHARGES')).toBe('cancelled');
    expect(parseFlightStatus('cancelled')).toBe('cancelled');
  });

  it('returns unknown for empty or unrecognized statuses', () => {
    expect(parseFlightStatus(null)).toBe('unknown');
    expect(parseFlightStatus('')).toBe('unknown');
    expect(parseFlightStatus('WEIRD_STATUS')).toBe('unknown');
  });

  it('never upgrades failed/cancelled/pending into confirmed via parse', () => {
    for (const raw of [
      'PENDING_CONFIRMATION',
      'PENDING',
      'CREATED',
      'FAILED',
      'EXPIRED',
      'CANCELLED',
      'CANCELLED_WITH_CHARGES',
    ]) {
      expect(parseFlightStatus(raw)).not.toBe('confirmed');
      expect(flightStatusConfirmsSeat(raw)).toBe(false);
    }
  });

  it('flightStatusConfirmsSeat is true only for confirmed/ticketed', () => {
    expect(flightStatusConfirmsSeat('CONFIRMED')).toBe(true);
    expect(flightStatusConfirmsSeat('TICKETED')).toBe(true);
    expect(flightStatusConfirmsSeat('PENDING_CONFIRMATION')).toBe(false);
  });
});
