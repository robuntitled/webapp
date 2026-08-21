import { getParticipantCount } from '@/lib/trips/display';
import { tripMinSeats } from '@/lib/trips/formation';
import type { TripParticipant, TripWithRelations } from '@/types/trip';

export type SeatStatus = 'provisional' | 'confirmed';

/** Trip da catalogo: soglia = voli confermati, non solo iscritti. */
export function usesFlightThreshold(
  trip: Pick<TripWithRelations, 'templateId'>
): boolean {
  return Boolean(trip.templateId);
}

export function participantSeatStatus(p: TripParticipant): SeatStatus {
  return p.seatStatus === 'confirmed' ? 'confirmed' : 'provisional';
}

export function confirmedFlightCount(trip: TripWithRelations): number {
  const fromRows = (trip.trip_participants ?? []).filter(
    (p) => participantSeatStatus(p) === 'confirmed'
  ).length;
  if (fromRows > 0 || (trip.trip_participants ?? []).some((p) => p.seatStatus)) {
    return fromRows;
  }
  return trip.confirmedFlightCount ?? 0;
}

export function hotelGroupCount(trip: TripWithRelations): number {
  return (trip.trip_participants ?? []).filter(
    (p) => p.hotelMatchesGroup && p.hotelConfirmedAt
  ).length;
}

export function activityTicketCount(trip: TripWithRelations): number {
  return trip.activityTicketCount ?? 0;
}

export function flightsToMinimum(trip: TripWithRelations): number {
  return Math.max(0, tripMinSeats(trip) - confirmedFlightCount(trip));
}

export function isFlightThresholdMet(trip: TripWithRelations): boolean {
  if (!usesFlightThreshold(trip)) {
    const count = trip.participantCount ?? getParticipantCount(trip.trip_participants);
    return count >= tripMinSeats(trip);
  }
  return confirmedFlightCount(trip) >= tripMinSeats(trip);
}
