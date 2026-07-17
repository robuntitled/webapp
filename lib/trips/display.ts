import type { TripPlanningMode, TripWithRelations } from '@/types/trip';

export const PLANNING_MODE_META: Record<
  TripPlanningMode,
  { label: string; shortLabel: string; emoji: string; description: string }
> = {
  solo: {
    label: 'Solo (aperto al gruppo)',
    shortLabel: 'Solo',
    emoji: '🧳',
    description: 'Organizzato da una persona — altri possono unirsi dopo.',
  },
  group: {
    label: 'Con gli amici',
    shortLabel: 'Gruppo',
    emoji: '🎉',
    description: 'Viaggio tra amici — entra in modalità relax.',
  },
};

export function getParticipantCount(participants?: { user_id: string }[]): number {
  return participants?.length ?? 0;
}

export function getSpotsLeft(maxParticipants: number, participantCount: number): number {
  return Math.max(0, maxParticipants - participantCount);
}

export function formatSpotsLabel(maxParticipants: number, participantCount: number): string {
  const left = getSpotsLeft(maxParticipants, participantCount);
  if (left === 0) return 'Al completo';
  if (left === 1) return '1 posto libero';
  return `${left} posti liberi`;
}

export function isTripFull(maxParticipants: number, participantCount: number): boolean {
  // Se max non è valorizzato o è 0, non considerarlo pieno
  if (!maxParticipants || maxParticipants < 1) return false;
  return getSpotsLeft(maxParticipants, participantCount) === 0;
}

export function getTripCreatorId(trip: TripWithRelations): string | null {
  return trip.creator?.id ?? trip.creator_id ?? null;
}

export function isTripCreator(trip: TripWithRelations, userId?: string | null): boolean {
  if (!userId) return false;
  const creatorId = getTripCreatorId(trip);
  return Boolean(creatorId && creatorId === userId);
}

export function isTripParticipant(trip: TripWithRelations, userId?: string | null): boolean {
  if (!userId) return false;
  if (isTripCreator(trip, userId)) return true;
  return trip.trip_participants?.some((p) => p.user_id === userId) ?? false;
}

export function resolvePlanningMode(trip: TripWithRelations): TripPlanningMode {
  const mode = trip.planningMode;
  if (mode === 'solo' || mode === 'group') return mode;
  // Legacy / missing: consider open (solo) so trips are discoverable
  return 'solo';
}

/** Viaggi “aperti” da mostrare in Scopri (modalità solo / aperti al pubblico). */
export function isOpenSoloTrip(trip: TripWithRelations): boolean {
  return resolvePlanningMode(trip) === 'solo';
}

/**
 * Viaggi visibili in Scopri viaggi:
 * - modalità Solo (aperti) — i group restano privati tra amici
 * - con posti liberi
 * - non i tuoi
 * - non quelli a cui sei già iscritto
 */
export function isDiscoverableSoloTrip(
  trip: TripWithRelations,
  userId?: string | null
): boolean {
  if (!isOpenSoloTrip(trip)) return false;

  const max = Number(trip.maxParticipants) || 0;
  const count = trip.participantCount ?? getParticipantCount(trip.trip_participants);
  if (isTripFull(max, count)) return false;

  if (!userId) return true;
  if (isTripCreator(trip, userId)) return false;
  if (isTripParticipant(trip, userId)) return false;
  return true;
}

export function canJoinTrip(trip: TripWithRelations, userId?: string | null): boolean {
  if (!userId) return false;
  return isDiscoverableSoloTrip(trip, userId);
}
