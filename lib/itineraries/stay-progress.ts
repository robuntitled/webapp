import type { HotelBookingRecap } from '@/lib/itineraries/bookings';
import type { HotelStay } from '@/lib/itineraries/dates';

export type StayBookingProgress = {
  booked: number;
  total: number;
  nextStayIdx: number | null;
  isComplete: boolean;
};

export function isStayBooked(stay: HotelStay, hotels: HotelBookingRecap[]): boolean {
  return hotels.some((h) => {
    const cityMatch =
      h.city && stay.city && h.city.toLowerCase() === stay.city.toLowerCase();
    const checkinMatch =
      h.checkin && h.checkin.slice(0, 10) === stay.checkin.slice(0, 10);
    return Boolean(cityMatch || checkinMatch);
  });
}

function stayIsBooked(stay: HotelStay, hotels: HotelBookingRecap[]): boolean {
  return isStayBooked(stay, hotels);
}

export function getStayBookingProgress(
  stays: HotelStay[],
  hotels: HotelBookingRecap[]
): StayBookingProgress {
  if (!stays.length) {
    return { booked: 0, total: 0, nextStayIdx: null, isComplete: true };
  }
  let booked = 0;
  let nextStayIdx: number | null = null;
  for (let i = 0; i < stays.length; i++) {
    if (stayIsBooked(stays[i], hotels)) {
      booked++;
    } else if (nextStayIdx == null) {
      nextStayIdx = i;
    }
  }
  return {
    booked,
    total: stays.length,
    nextStayIdx,
    isComplete: booked >= stays.length,
  };
}

export function activityDateForDay(dateFrom: string, dayNumber: number): string {
  const from = new Date(`${dateFrom.slice(0, 10)}T00:00:00`);
  from.setDate(from.getDate() + dayNumber - 1);
  return from.toISOString().slice(0, 10);
}
