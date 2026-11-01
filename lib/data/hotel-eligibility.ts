import 'server-only';

import { getPractice } from '@/lib/data/practices';
import { tripAllowsHotelBooking } from '@/lib/data/trip-commitments';

export const HOTEL_ELIGIBILITY_DENIED_MESSAGE =
  "In questo viaggio di gruppo l'hotel si prenota dopo il volo confermato." as const;

export type HotelEligibilityInput = {
  userId: string;
  practiceId?: string | null;
  tripId?: string | null;
};

export type HotelEligibilityResult =
  | { ok: true }
  | { ok: false; reason: 'practice_not_found' | 'group_draft' | 'trip_not_allowed'; message: string };

/**
 * Gate hotel prebook/book: gruppo in draft (senza volo confermato) non può prenotare.
 * Pure-ish: riusa getPractice + tripAllowsHotelBooking.
 */
export async function checkHotelEligibility(
  input: HotelEligibilityInput
): Promise<HotelEligibilityResult> {
  if (input.practiceId) {
    const practice = await getPractice(input.practiceId, input.userId);
    if (!practice) {
      return {
        ok: false,
        reason: 'practice_not_found',
        message: 'Pratica non trovata.',
      };
    }
    if (practice.mode === 'group' && practice.status === 'draft') {
      return {
        ok: false,
        reason: 'group_draft',
        message: HOTEL_ELIGIBILITY_DENIED_MESSAGE,
      };
    }
  }

  if (input.tripId) {
    const allowed = await tripAllowsHotelBooking(input.tripId);
    if (!allowed) {
      return {
        ok: false,
        reason: 'trip_not_allowed',
        message: HOTEL_ELIGIBILITY_DENIED_MESSAGE,
      };
    }
  }

  return { ok: true };
}
