/**
 * One day → one representative offer for calendar chips + Selezionato.
 * Chip stats must come from the SAME offer (never independent min price /
 * min stops / min duration across different flights).
 */

export type DayOfferLike = {
  id: string;
  price: number;
  stops: number;
  durationMinutes: number;
  airline?: string | null;
};

export type DayChipStats = {
  cheapestPrice: number;
  minStops: number;
  minDurationMinutes: number;
  airline: string | null;
  offerId: string;
};

/** Cheapest by price; ties → fewer stops → shorter duration → stable id. */
export function pickCheapestDayOffer<T extends DayOfferLike>(offers: T[]): T | null {
  if (!offers.length) return null;
  return [...offers].sort(
    (a, b) =>
      a.price - b.price ||
      a.stops - b.stops ||
      a.durationMinutes - b.durationMinutes ||
      a.id.localeCompare(b.id)
  )[0]!;
}

export function chipStatsFromOffer(offer: DayOfferLike): DayChipStats {
  return {
    cheapestPrice: offer.price,
    minStops: offer.stops,
    minDurationMinutes: offer.durationMinutes,
    airline: offer.airline ?? null,
    offerId: offer.id,
  };
}

/** Summary badge payload from a day's offer list (single-offer consistency). */
export function dayChipFromOffers(offers: DayOfferLike[]): DayChipStats | null {
  const best = pickCheapestDayOffer(offers);
  return best ? chipStatsFromOffer(best) : null;
}

/**
 * After tap (or Altre opzioni), chip per-person price must equal selected
 * per-person price (adults=1 search basis).
 */
export function chipMatchesSelectedPerPerson(
  chipPrice: number | null | undefined,
  selectedPerPerson: number | null | undefined,
  opts?: { tolerance?: number }
): boolean {
  if (chipPrice == null || selectedPerPerson == null) return false;
  if (!Number.isFinite(chipPrice) || !Number.isFinite(selectedPerPerson)) return false;
  const tol = opts?.tolerance ?? 0.5;
  return Math.abs(chipPrice - selectedPerPerson) <= tol;
}

/** Per-person price stored on the leg when total = perPerson * adults. */
export function selectedPerPersonPrice(
  totalPrice: number,
  adults: number
): number {
  const pax = Math.max(1, adults);
  return Math.round((totalPrice / pax) * 100) / 100;
}
