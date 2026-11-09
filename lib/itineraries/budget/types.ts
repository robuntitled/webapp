/**
 * Itinerary-sourced budget model (Organizza / planner).
 * Live prices when available; otherwise documented estimates with source+date.
 */

export type BudgetPriceKind = 'live' | 'estimate' | 'unknown';

export type BudgetSource = {
  id: string;
  labelIt: string;
  sourceUrl: string;
  retrievedOn: string;
};

export type BudgetLine = {
  id: string;
  category:
    | 'flights'
    | 'hotels'
    | 'internal_transfers'
    | 'daily_living'
    | 'activities';
  labelIt: string;
  /** Absolute EUR for the whole party (not per person). */
  amountEur: number | null;
  kind: BudgetPriceKind;
  /** Short note: range, rooms, nights, etc. */
  detailIt?: string;
  sourceIds?: string[];
};

export type BudgetCategoryId = BudgetLine['category'];

export type BudgetBreakdown = {
  destinationSlug: string;
  tripDays: number;
  nights: number;
  travelers: number;
  rooms: number;
  vibe: string | null;
  lines: BudgetLine[];
  sources: BudgetSource[];
  /** Party total (sum of known lines). Null if nothing computable. */
  totalEur: number | null;
  /** Per-person share of totalEur. */
  perPersonEur: number | null;
  /** True when at least one line is unknown. */
  hasUnknown: boolean;
  /** Category rollups for UI. */
  byCategory: Record<
    BudgetCategoryId,
    { amountEur: number | null; kind: BudgetPriceKind; labelIt: string }
  >;
};

export type HotelTier = 'budget' | 'mid' | 'comfort';

export type NightlyRateBand = {
  budget: number;
  mid: number;
  comfort: number;
};

export type DailyLivingBand = {
  foodEur: number;
  localTransportEur: number;
};

export type DestinationCostTable = {
  slug: string;
  nameIt: string;
  retrievedOn: string;
  sources: BudgetSource[];
  /** Round-trip from Italy (MXP/FCO class) — mid used as default estimate. */
  flightRoundtripEur: {
    low: number;
    mid: number;
    high: number;
    sourceId: string;
  };
  /** Default hotel per night (EUR/room) by travel style tier. */
  hotelPerNightEur: NightlyRateBand & {
    sourceId: string;
    byArea?: Record<string, NightlyRateBand>;
  };
  dailyLivingPerPersonEur: Record<
    'relax' | 'divertimento' | 'avventura',
    DailyLivingBand & { sourceId: string }
  >;
  transferEur: {
    internal_flight: number;
    bus: number;
    train: number;
    ferry: number;
    sourceId: string;
  };
  /** Typical paid entry / activity when present in the remapped day. */
  activityEntryEur: {
    default: number;
    sourceId: string;
    byKeyword?: Array<{ match: RegExp; amountEur: number }>;
  };
};
