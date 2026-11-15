import {
  listPracticeFlightBookings,
} from '@/lib/itineraries/practice-flights';
import { parseFlightStatus } from '@/lib/itineraries/bookings';
import {
  practiceHasPaidHotelOrActivity,
} from '@/lib/itineraries/hub-trip-status';
import type { PracticeRow } from '@/lib/itineraries/types';
import { DASHBOARD_VIAGGI_COPY } from '@/lib/itineraries/dashboard-viaggi-copy';

export type DeleteBlockReason =
  | 'paid_flight'
  | 'pending_flight'
  | 'failed_with_charge'
  | 'paid_hotel_or_activity'
  | 'has_other_members'
  | 'not_owner'
  | 'not_found';

export type DeleteEligibility = {
  canHardDelete: boolean;
  /** Creator should leave + transfer role instead of deleting. */
  shouldTransferAndLeave: boolean;
  blockReason: DeleteBlockReason | null;
  message: string | null;
};

/**
 * Regole Kr (dashboard):
 * - eliminabili solo bozze (senza pagamenti)
 * - volo pending = pagato → non eliminabile
 * - failed eliminabile solo se il server verifica nessun addebito (`chargeVerifiedNone`)
 * - hotel/attività pagati bloccano
 * - con altri utenti: non si cancella → trasferimento creatore
 */
export function evaluatePracticeDelete(input: {
  practice: PracticeRow;
  isCreator: boolean;
  otherActiveMemberCount: number;
  /** Server re-check: true only after verifying no charge for failed bookings. */
  chargeVerifiedNone: boolean;
}): DeleteEligibility {
  const { practice, isCreator, otherActiveMemberCount, chargeVerifiedNone } = input;
  const toast = DASHBOARD_VIAGGI_COPY.toast;

  if (!isCreator) {
    return {
      canHardDelete: false,
      shouldTransferAndLeave: false,
      blockReason: 'not_owner',
      message: null,
    };
  }

  // Kr #4 + #6: con altri partecipanti non si cancella il viaggio —
  // il creatore esce e il ruolo passa al più anziano iscritto.
  if (otherActiveMemberCount > 0) {
    return {
      canHardDelete: false,
      shouldTransferAndLeave: true,
      blockReason: 'has_other_members',
      message: toast.deleteBlockedMembers,
    };
  }

  if (practiceHasPaidHotelOrActivity(practice)) {
    return {
      canHardDelete: false,
      shouldTransferAndLeave: false,
      blockReason: 'paid_hotel_or_activity',
      message: toast.deleteBlockedHotel,
    };
  }

  const flights = listPracticeFlightBookings(practice);
  for (const fb of flights) {
    const kind = parseFlightStatus(fb.status);
    if (kind === 'pending' || kind === 'confirmed') {
      return {
        canHardDelete: false,
        shouldTransferAndLeave: false,
        blockReason: kind === 'pending' ? 'pending_flight' : 'paid_flight',
        message: toast.deleteBlockedPaid,
      };
    }
    if (kind === 'failed') {
      const amount = fb.amountEur ?? null;
      const looksCharged = amount != null && amount > 0;
      if (looksCharged || !chargeVerifiedNone) {
        return {
          canHardDelete: false,
          shouldTransferAndLeave: false,
          blockReason: 'failed_with_charge',
          message: toast.deleteFailedCharge,
        };
      }
    }
    // cancelled by carrier: keep trip (not delete) — CE 261 note in UI
    if (kind === 'cancelled') {
      return {
        canHardDelete: false,
        shouldTransferAndLeave: false,
        blockReason: 'paid_flight',
        message: toast.deleteBlockedPaid,
      };
    }
  }

  // Draft / no paid services → hard delete (solo se nessun altro membro)
  const isDraftLike =
    practice.status === 'draft' ||
    (!flights.length && !practice.flight_confirmed_at);

  if (!isDraftLike) {
    return {
      canHardDelete: false,
      shouldTransferAndLeave: false,
      blockReason: 'paid_flight',
      message: toast.deleteBlockedPaid,
    };
  }

  return {
    canHardDelete: true,
    shouldTransferAndLeave: false,
    blockReason: null,
    message: null,
  };
}
