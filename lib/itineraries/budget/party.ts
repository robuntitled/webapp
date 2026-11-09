import type { OrganizzaCompanyChoice } from '@/lib/itineraries/organizza-steps';
import type { HotelTier } from '@/lib/itineraries/budget/types';
import type { RemapVibe } from '@/lib/itineraries/masters/remap';

export type BudgetParty = {
  travelers: number;
  rooms: number;
};

/** Derive party size from Organizza «Con chi» (defaults, editable later). */
export function partyFromCompany(
  company: OrganizzaCompanyChoice | null | undefined
): BudgetParty {
  if (company === 'amici') return { travelers: 2, rooms: 1 };
  // solo / gruppo / unset → per-person baseline
  return { travelers: 1, rooms: 1 };
}

export function hotelTierFromVibe(
  vibe: RemapVibe | string | null | undefined
): HotelTier {
  if (vibe === 'relax') return 'comfort';
  if (vibe === 'avventura') return 'budget';
  return 'mid';
}

export function asRemapVibe(
  vibe: string | null | undefined
): RemapVibe | null {
  if (vibe === 'relax' || vibe === 'divertimento' || vibe === 'avventura') return vibe;
  return null;
}
