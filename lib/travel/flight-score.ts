/**
 * Rank flight offers for Organizza «Voli consigliati».
 * Pure functions — unit-tested with mocked offers.
 */

export type ScoredFlightInput = {
  id: string;
  price: number;
  currency?: string;
  stops: number;
  durationMinutes: number;
  /** Minutes of overnight layover risk (sum of layovers crossing 00:00–05:00). */
  overnightLayoverMinutes?: number;
  /** Earliest arrival local hour 0–23. */
  arrivalHourLocal?: number | null;
  /** True when a self-transfer / separate ticket is flagged. */
  selfTransfer?: boolean;
  /** Minimum connection minutes on the shortest layover (null if nonstop). */
  minConnectionMinutes?: number | null;
};

export type FlightScoreBreakdown = {
  id: string;
  total: number;
  priceScore: number;
  stopsScore: number;
  durationScore: number;
  overnightPenalty: number;
  arrivalPenalty: number;
  connectionPenalty: number;
};

export type RecommendedFlightPick = {
  kind: 'cheapest' | 'fastest' | 'balanced';
  labelIt: string;
  offerId: string;
};

const MIN_CONNECTION_OK = 50;

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function scoreFlightOffer(
  offer: ScoredFlightInput,
  cohort: ScoredFlightInput[]
): FlightScoreBreakdown {
  const prices = cohort.map((o) => o.price);
  const durs = cohort.map((o) => o.durationMinutes);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const minD = Math.min(...durs);
  const maxD = Math.max(...durs);

  const priceNorm = maxP > minP ? (offer.price - minP) / (maxP - minP) : 0;
  const durNorm =
    maxD > minD ? (offer.durationMinutes - minD) / (maxD - minD) : 0;
  const stopsNorm = clamp01(offer.stops / 2);

  const overnightPenalty = clamp01((offer.overnightLayoverMinutes ?? 0) / 360) * 0.25;
  const hour = offer.arrivalHourLocal;
  const arrivalPenalty =
    hour == null
      ? 0
      : hour >= 0 && hour < 6
        ? 0.18
        : hour >= 22
          ? 0.1
          : 0;
  let connectionPenalty = 0;
  if (offer.selfTransfer) connectionPenalty += 0.35;
  if (
    offer.minConnectionMinutes != null &&
    offer.minConnectionMinutes > 0 &&
    offer.minConnectionMinutes < MIN_CONNECTION_OK
  ) {
    connectionPenalty += 0.2;
  }

  const priceScore = priceNorm * 0.42;
  const stopsScore = stopsNorm * 0.2;
  const durationScore = durNorm * 0.23;
  const total =
    priceScore +
    stopsScore +
    durationScore +
    overnightPenalty +
    arrivalPenalty +
    connectionPenalty;

  return {
    id: offer.id,
    total,
    priceScore,
    stopsScore,
    durationScore,
    overnightPenalty,
    arrivalPenalty,
    connectionPenalty,
  };
}

/** Lower score = better. */
export function pickRecommendedFlights(
  offers: ScoredFlightInput[]
): RecommendedFlightPick[] {
  if (!offers.length) return [];
  const scored = offers
    .map((o) => ({ offer: o, score: scoreFlightOffer(o, offers) }))
    .sort((a, b) => a.score.total - b.score.total);

  const cheapest = [...offers].sort((a, b) => a.price - b.price)[0]!;
  const fastest = [...offers].sort(
    (a, b) =>
      a.durationMinutes - b.durationMinutes || a.stops - b.stops || a.price - b.price
  )[0]!;
  const balanced = scored[0]!.offer;

  const picks: RecommendedFlightPick[] = [
    { kind: 'cheapest', labelIt: 'Più conveniente', offerId: cheapest.id },
    { kind: 'fastest', labelIt: 'Più veloce', offerId: fastest.id },
    { kind: 'balanced', labelIt: 'Equilibrato', offerId: balanced.id },
  ];

  // Deduplicate if same offer wins multiple labels — keep first unique ids order
  const seen = new Set<string>();
  return picks.filter((p) => {
    if (seen.has(p.offerId)) return false;
    seen.add(p.offerId);
    return true;
  });
}

export type DayBadgeStats = {
  date: string;
  cheapestPrice: number | null;
  minStops: number | null;
  minDurationMinutes: number | null;
  loading?: boolean;
  error?: string | null;
};

export type NearbyDaySuggestion = {
  suggestedDate: string;
  reasonIt: string;
  /** Current selection date that is "bad". */
  fromDate: string;
};

/**
 * If the selected day's best option is much worse than a nearby day
 * (e.g. 40h vs 12h direct), suggest switching.
 */
export function suggestNearbyFlightDay(
  selectedDate: string,
  badges: DayBadgeStats[],
  opts?: { durationRatio?: number; minAbsoluteHoursSaved?: number }
): NearbyDaySuggestion | null {
  const selected = badges.find((b) => b.date === selectedDate);
  if (!selected || selected.minDurationMinutes == null) return null;

  const ratio = opts?.durationRatio ?? 1.6;
  const minSavedMin = (opts?.minAbsoluteHoursSaved ?? 6) * 60;

  let best: DayBadgeStats | null = null;
  for (const b of badges) {
    if (b.date === selectedDate) continue;
    if (b.minDurationMinutes == null) continue;
    if (!best || b.minDurationMinutes < best.minDurationMinutes!) best = b;
  }
  if (!best || best.minDurationMinutes == null) return null;

  const selectedDur = selected.minDurationMinutes;
  const bestDur = best.minDurationMinutes;
  const saved = selectedDur - bestDur;
  if (saved < minSavedMin) return null;
  if (selectedDur < bestDur * ratio) return null;

  const hours = Math.round(bestDur / 60);
  const direct =
    best.minStops === 0 ? 'un volo diretto' : `un volo con ${best.minStops} scalo/i`;
  const dayLabel = formatDayIt(best.date);
  return {
    fromDate: selectedDate,
    suggestedDate: best.date,
    reasonIt: `Il ${dayLabel} c’è ${direct} da circa ${hours} ore${
      best.cheapestPrice != null ? ` (da ${Math.round(best.cheapestPrice)} €)` : ''
    }.`,
  };
}

function formatDayIt(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y!, m! - 1, d!));
    return dt.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

/** Dates in [center-radius, center+radius] inclusive (ISO yyyy-mm-dd). */
export function nearbyDateWindow(centerIso: string, radiusDays = 3): string[] {
  const [y, m, d] = centerIso.split('-').map(Number);
  const center = Date.UTC(y!, m! - 1, d!);
  const out: string[] = [];
  for (let i = -radiusDays; i <= radiusDays; i++) {
    const t = new Date(center + i * 86400000);
    out.push(t.toISOString().slice(0, 10));
  }
  return out;
}
