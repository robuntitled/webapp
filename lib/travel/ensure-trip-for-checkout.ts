/**
 * Assicura un practiceId sul draft di checkout (Fase 1).
 * Usato dopo login e prima del pagamento: niente checkout orfano.
 */

import {
  createTripFromFlightAction,
  createTripFromHotelAction,
} from '@/actions/practices';
import {
  loadFlightCheckoutDraft,
  saveFlightCheckoutDraft,
} from '@/lib/travel/flight-checkout-draft';
import {
  loadHotelOfferDraft,
  saveHotelOfferDraft,
} from '@/lib/travel/hotel-offer-draft';
import {
  clearTripFromSearchDraft,
  loadTripFromSearchDraft,
} from '@/lib/travel/trip-from-search-draft';

export async function ensureFlightPracticeOnCheckout(): Promise<string | null> {
  const draft = loadFlightCheckoutDraft();
  if (draft?.practiceId) {
    clearTripFromSearchDraft();
    return draft.practiceId;
  }

  const pending = loadTripFromSearchDraft();
  const seed =
    pending?.kind === 'flight'
      ? pending.seed
      : draft
        ? {
            origin: draft.outbound.origin,
            destination: draft.outbound.destination,
            departureAt: draft.outbound.departureAt,
            returnDepartureAt: draft.returnLeg?.departureAt,
            returnDestination: draft.returnLeg?.destination,
            tripType: draft.tripType,
          }
        : null;

  if (!seed?.origin || !seed.destination) return draft?.practiceId ?? null;

  const result = await createTripFromFlightAction({ seed });
  if ('error' in result) return null;

  if (draft) {
    saveFlightCheckoutDraft({ ...draft, practiceId: result.practiceId });
  } else if (pending?.kind === 'flight') {
    saveFlightCheckoutDraft({
      ...pending.checkout,
      practiceId: result.practiceId,
      createdAt: Date.now(),
    });
  }
  clearTripFromSearchDraft();
  return result.practiceId;
}

export async function ensureHotelPracticeOnCheckout(): Promise<string | null> {
  const draft = loadHotelOfferDraft();
  if (draft?.practiceId) {
    clearTripFromSearchDraft();
    return draft.practiceId;
  }

  const pending = loadTripFromSearchDraft();
  const seed =
    pending?.kind === 'hotel'
      ? pending.seed
      : draft
        ? {
            city: draft.city ?? draft.name,
            checkin: draft.checkin,
            checkout: draft.checkout,
          }
        : null;

  if (!seed?.checkin || !seed.checkout) return draft?.practiceId ?? null;

  const result = await createTripFromHotelAction({ seed });
  if ('error' in result) return null;

  if (draft) {
    saveHotelOfferDraft({ ...draft, practiceId: result.practiceId });
  } else if (pending?.kind === 'hotel') {
    saveHotelOfferDraft({
      ...pending.checkout,
      practiceId: result.practiceId,
      savedAt: Date.now(),
    });
  }
  clearTripFromSearchDraft();
  return result.practiceId;
}
