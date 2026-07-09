import type { TripPlanningMode } from '@/types/trip';

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
  return getSpotsLeft(maxParticipants, participantCount) === 0;
}