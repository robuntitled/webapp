import { differenceInCalendarDays } from 'date-fns';
import { getParticipantCount, getSpotsLeft } from '@/lib/trips/display';
import type { TripWithRelations } from '@/types/trip';

export type TripLifecycleStatus = 'draft' | 'forming' | 'confirmed' | 'published' | 'archived';

export function tripMinSeats(trip: Pick<TripWithRelations, 'minParticipants'>): number {
  const min = Number(trip.minParticipants);
  return Number.isFinite(min) && min > 0 ? min : 1;
}

export function isGroupSolid(trip: TripWithRelations): boolean {
  const count = trip.participantCount ?? getParticipantCount(trip.trip_participants);
  return count >= tripMinSeats(trip);
}

export function seatsToMinimum(trip: TripWithRelations): number {
  const count = trip.participantCount ?? getParticipantCount(trip.trip_participants);
  return Math.max(0, tripMinSeats(trip) - count);
}

export function departureGuaranteeActive(trip: TripWithRelations): boolean {
  return !isGroupSolid(trip);
}

export function canBookTripServices(trip: TripWithRelations): boolean {
  return isGroupSolid(trip);
}

export function isClosingSoon(trip: TripWithRelations, now = new Date()): boolean {
  const count = trip.participantCount ?? getParticipantCount(trip.trip_participants);
  const left = getSpotsLeft(Number(trip.maxParticipants) || 0, count);
  if (left > 0 && left <= 3) return true;
  const start = new Date(trip.startDate);
  if (Number.isNaN(start.getTime())) return false;
  const days = differenceInCalendarDays(start, now);
  return days >= 0 && days <= 21;
}

export function formationLabel(trip: TripWithRelations): string {
  if (isGroupSolid(trip)) return 'Gruppo formato';
  const missing = seatsToMinimum(trip);
  if (missing === 1) return 'In formazione · manca 1 posto al minimo';
  return `In formazione · mancano ${missing} posti al minimo`;
}

export function departureGuaranteeCopy(trip: TripWithRelations): string {
  const min = tripMinSeats(trip);
  if (isGroupSolid(trip)) {
    return 'Garanzia di partenza attiva: il gruppo ha raggiunto il minimo.';
  }
  return `Garanzia di partenza: il viaggio parte al raggiungimento di ${min} posti.`;
}
