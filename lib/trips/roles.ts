export type TripParticipantRole = 'owner' | 'editor' | 'viewer';

export const TRIP_ROLE_META: Record<
  TripParticipantRole,
  { label: string; emoji: string; description: string }
> = {
  owner: {
    label: 'Organizzatore',
    emoji: '🧭',
    description: 'Guida il viaggio, aggiorna piani e prezzi.',
  },
  editor: {
    label: 'Co-pilota',
    emoji: '✏️',
    description: 'Aiuta a modificare itinerario e idee.',
  },
  viewer: {
    label: 'Modalità relax',
    emoji: '🏖️',
    description: 'Zero stress: guardi, confermi e prenoti quando vuoi.',
  },
};

export function resolveUserTripRole(
  userId: string | undefined,
  creatorId: string | null | undefined,
  participantRole?: TripParticipantRole | null
): TripParticipantRole | null {
  if (!userId) return null;
  if (creatorId === userId) return 'owner';
  return participantRole ?? null;
}