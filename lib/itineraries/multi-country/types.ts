import type { TransferMode } from '@/lib/itineraries/masters/types';
import type { ItineraryDay } from '@/lib/itineraries/types';
import type { BudgetBreakdown } from '@/lib/itineraries/budget/types';

export type InterCountryTransfer = {
  fromSlug: string;
  toSlug: string;
  mode: TransferMode;
  /** Door-to-door hours when known. */
  durationHours: number | null;
  verified: boolean;
  /** Mid estimate EUR per person; null → da verificare. */
  costEurPerPerson: number | null;
  notesIt: string;
  sourceLabelIt: string;
  sourceUrl: string;
  retrievedOn: string;
};

export type CuratedMultiCountryPair = {
  id: string;
  /** Canonical travel order (arrive first, depart last). */
  slugs: [string, string];
  titleIt: string;
  blurbIt: string;
  transfer: InterCountryTransfer;
  /** Open-jaw A/R estimate from Italy (arrive A, leave B). */
  openJawFlightEur: {
    low: number;
    mid: number;
    high: number;
    sourceLabelIt: string;
    sourceUrl: string;
    retrievedOn: string;
  };
  arrivalHubIata: string;
  departureHubIata: string;
};

export type CountryDayShare = {
  slug: string;
  nameIt: string;
  days: number;
  weight: number;
};

export type MultiCountryPlan = {
  ok: true;
  pairId: string;
  /** False for free (non-curated) user combinations. */
  curated: boolean;
  orderedSlugs: string[];
  titleIt: string;
  tripDays: number;
  shares: CountryDayShare[];
  transfer: InterCountryTransfer;
  /** True when transfer is curated but unverified / cost unknown. */
  transferNeedsCheck: boolean;
  /** Free combo: user must check links/times between countries. */
  unverifiedCombination: boolean;
  unverifiedNoticeIt: string | null;
  arrivalIata: string;
  departureIata: string;
  days: ItineraryDay[];
  /** Per-country budget (no international flight). */
  countryBudgets: Array<{ slug: string; nameIt: string; breakdown: BudgetBreakdown }>;
  /** Inter-country transfer line. */
  transferCostEur: number | null;
  transferCostKind: 'estimate' | 'unknown';
  /** International open-jaw flight (party total uses travelers later). */
  openJawFlightEurPerPerson: number | null;
  openJawFlightKind: 'estimate' | 'unknown';
  openJawFlightDetailIt: string;
  /** Combined per-person total (solo baseline). */
  totalPerPersonEur: number | null;
  visaNoticeIt: string;
  visaUrl: string;
  gaps: string[];
};

export type MultiCountryPlanFail = {
  ok: false;
  reason: 'unknown_pair' | 'missing_master' | 'too_short' | 'cannot_split';
  message: string;
};

export const UNVERIFIED_COMBO_NOTICE_IT =
  'Combinazione non verificata: controlla collegamenti e tempi di spostamento tra i paesi';

