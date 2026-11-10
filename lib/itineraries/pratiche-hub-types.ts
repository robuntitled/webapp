import type { PracticeRow } from '@/lib/itineraries/types';

export type HubPracticeCard = PracticeRow & {
  /** Display title override (edition title). */
  hubTitle?: string | null;
  /** True when current user created the private/group trip. */
  organizedByMe?: boolean;
  /** Confirmed flight seats among participants (owner view). */
  bookedSeats?: number | null;
  /** Total participants in the edition. */
  totalSeats?: number | null;
};
