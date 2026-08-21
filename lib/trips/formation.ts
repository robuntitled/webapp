import { differenceInCalendarDays, differenceInMinutes, subDays } from 'date-fns';
import { getParticipantCount, getSpotsLeft } from '@/lib/trips/display';
import {
  confirmedFlightCount,
  flightsToMinimum,
  isFlightThresholdMet,
  usesFlightThreshold,
} from '@/lib/trips/commitment';
import { groupThresholdCopy } from '@/lib/legal/compliance-copy';
import type { TripWithRelations } from '@/types/trip';

export type TripLifecycleStatus = 'draft' | 'forming' | 'confirmed' | 'published' | 'archived';

export function tripMinSeats(trip: Pick<TripWithRelations, 'minParticipants'>): number {
  const min = Number(trip.minParticipants);
  return Number.isFinite(min) && min > 0 ? min : 1;
}

export function isGroupSolid(trip: TripWithRelations): boolean {
  return isFlightThresholdMet(trip);
}

export function seatsToMinimum(trip: TripWithRelations): number {
  if (usesFlightThreshold(trip)) {
    return flightsToMinimum(trip);
  }
  const count = trip.participantCount ?? getParticipantCount(trip.trip_participants);
  return Math.max(0, tripMinSeats(trip) - count);
}

/**
 * "Soglia del gruppo" (ex "garanzia di partenza"): NON è un'obbligazione di viaggio
 * di NomadLink. È attiva finché il gruppo non raggiunge il minimo. Vedi
 * lib/legal/compliance-copy.ts e art. 41 D.Lgs. 62/2018.
 */
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
  if (usesFlightThreshold(trip)) {
    const confirmed = confirmedFlightCount(trip);
    const min = tripMinSeats(trip);
    const missing = flightsToMinimum(trip);
    if (missing === 1) {
      return `In formazione · voli ${confirmed}/${min} · manca 1 volo`;
    }
    return `In formazione · voli ${confirmed}/${min} · mancano ${missing} voli`;
  }
  const missing = seatsToMinimum(trip);
  if (missing === 1) return 'In formazione · manca 1 posto al minimo';
  return `In formazione · mancano ${missing} posti al minimo`;
}

export function departureGuaranteeCopy(trip: TripWithRelations): string {
  return groupThresholdCopy(
    tripMinSeats(trip),
    isGroupSolid(trip),
    usesFlightThreshold(trip) ? 'flights' : 'participants'
  );
}

export function lastJoinAt(trip: TripWithRelations): Date | null {
  const times = (trip.trip_participants ?? [])
    .map((p) => p.joinedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  return times[0] ?? null;
}

export function lastJoinLabel(trip: TripWithRelations, now = new Date()): string | null {
  const at = lastJoinAt(trip);
  if (!at) return null;
  const mins = differenceInMinutes(now, at);
  if (mins < 0) return null;
  if (mins < 2) return 'Si è unito qualcuno adesso';
  if (mins < 60) return `Si è unito qualcuno ${mins} minuti fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Si è unito qualcuno ${hours === 1 ? 'un’ora' : `${hours} ore`} fa`;
  const days = differenceInCalendarDays(now, at);
  if (days === 1) return 'Si è unito qualcuno ieri';
  if (days < 7) return `Si è unito qualcuno ${days} giorni fa`;
  return null;
}

export function joinDeadlineDate(trip: TripWithRelations): Date | null {
  const start = new Date(trip.startDate);
  if (Number.isNaN(start.getTime())) return null;
  return subDays(start, 7);
}

export function joinDeadlineLabel(trip: TripWithRelations, now = new Date()): string | null {
  const deadline = joinDeadlineDate(trip);
  if (!deadline) return null;
  const days = differenceInCalendarDays(deadline, now);
  if (days < 0) return null;
  if (days === 0) return 'Iscrizioni chiudono oggi';
  if (days === 1) return 'Iscrizioni chiudono domani';
  return `Iscrizioni aperte ancora ${days} giorni`;
}

export function activityCount(trip: TripWithRelations): number {
  return trip.participantCount ?? getParticipantCount(trip.trip_participants);
}
