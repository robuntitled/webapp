import { describe, expect, it } from 'vitest';
import { getStayBookingProgress, isStayBooked } from '@/lib/itineraries/stay-progress';
import type { HotelBookingRecap } from '@/lib/itineraries/bookings';
import type { HotelStay } from '@/lib/itineraries/dates';

const stays: HotelStay[] = [
  { label: 'Bangkok', city: 'Bangkok', checkin: '2026-12-01', checkout: '2026-12-05' },
  { label: 'Islands', city: 'Koh Samui', checkin: '2026-12-05', checkout: '2026-12-12' },
];

describe('stay booking progress', () => {
  it('requires all stays before complete', () => {
    const oneHotel: HotelBookingRecap[] = [
      {
        bookingId: '1',
        bookingRef: 'H1',
        hotelName: 'Bangkok Hotel',
        city: 'Bangkok',
        checkin: '2026-12-01',
        checkout: '2026-12-05',
        bookedAt: '2026-01-01',
      },
    ];
    const progress = getStayBookingProgress(stays, oneHotel);
    expect(progress.booked).toBe(1);
    expect(progress.total).toBe(2);
    expect(progress.isComplete).toBe(false);
    expect(progress.nextStayIdx).toBe(1);
  });

  it('marks complete when all stays booked', () => {
    const hotels: HotelBookingRecap[] = [
      {
        bookingId: '1',
        bookingRef: 'H1',
        hotelName: 'A',
        city: 'Bangkok',
        checkin: '2026-12-01',
        bookedAt: '2026-01-01',
      },
      {
        bookingId: '2',
        bookingRef: 'H2',
        hotelName: 'B',
        city: 'Koh Samui',
        checkin: '2026-12-05',
        bookedAt: '2026-01-02',
      },
    ];
    expect(getStayBookingProgress(stays, hotels).isComplete).toBe(true);
    expect(isStayBooked(stays[1], hotels)).toBe(true);
  });
});
