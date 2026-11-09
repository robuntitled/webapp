/**
 * Documented cost tables per destination (estimates, not live fares).
 * Sources: Wikivoyage «Costs» / destination pages, official tourism cites,
 * catalog master hints only as fallback with explicit attribution.
 *
 * Retrieved 2026-11-09. Amounts are mid-range EUR for Italian travelers.
 */

import type { DestinationCostTable, BudgetSource } from '@/lib/itineraries/budget/types';

const ON = '2026-11-09';
const WV = 'https://en.wikivoyage.org/wiki';

function src(
  id: string,
  labelIt: string,
  sourceUrl: string,
  retrievedOn = ON
): BudgetSource {
  return { id, labelIt, sourceUrl, retrievedOn };
}

/** Vietnam — Wikivoyage Vietnam / Hanoi / HCMC Costs bands. */
export const VIETNAM_COSTS: DestinationCostTable = {
  slug: 'vietnam',
  nameIt: 'Vietnam',
  retrievedOn: ON,
  sources: [
    src('wv-vn', 'Wikivoyage Vietnam — Costs / mid-range daily', `${WV}/Vietnam`),
    src('wv-vn-halong', 'Wikivoyage Ha Long Bay — cruise day fares', `${WV}/Ha_Long_Bay`),
    src('wv-vn-flight', 'Wikivoyage Vietnam — Getting there (Europe)', `${WV}/Vietnam#Get_in`),
    src('vn-domestic', 'Wikivoyage — domestic flights Hanoi↔Da Nang↔HCMC', `${WV}/Vietnam#Get_around`),
  ],
  flightRoundtripEur: { low: 550, mid: 700, high: 950, sourceId: 'wv-vn-flight' },
  hotelPerNightEur: {
    budget: 18,
    mid: 35,
    comfort: 70,
    sourceId: 'wv-vn',
    byArea: {
      Hanoi: { budget: 16, mid: 32, comfort: 65 },
      'Ha Long': { budget: 22, mid: 45, comfort: 90 },
      'Hoi An': { budget: 18, mid: 38, comfort: 75 },
      'Ho Chi Minh': { budget: 18, mid: 36, comfort: 72 },
      'Ho Chi Minh City': { budget: 18, mid: 36, comfort: 72 },
    },
  },
  dailyLivingPerPersonEur: {
    relax: { foodEur: 16, localTransportEur: 4, sourceId: 'wv-vn' },
    divertimento: { foodEur: 22, localTransportEur: 7, sourceId: 'wv-vn' },
    avventura: { foodEur: 20, localTransportEur: 10, sourceId: 'wv-vn' },
  },
  transferEur: {
    internal_flight: 55,
    bus: 12,
    train: 28,
    ferry: 0,
    sourceId: 'vn-domestic',
  },
  activityEntryEur: {
    default: 12,
    sourceId: 'wv-vn',
    byKeyword: [
      { match: /ha\s*long|baia/i, amountEur: 45 },
      { match: /cu\s*chi|mekong/i, amountEur: 25 },
    ],
  },
};

/** Thailandia — Wikivoyage Thailand Costs + TAT destination pages. */
export const THAILANDIA_COSTS: DestinationCostTable = {
  slug: 'thailandia',
  nameIt: 'Thailandia',
  retrievedOn: ON,
  sources: [
    src('wv-th', 'Wikivoyage Thailand — Costs / mid-range', `${WV}/Thailand`),
    src('wv-th-flight', 'Wikivoyage Thailand — Getting there', `${WV}/Thailand#Get_in`),
    src('tat', 'Tourism Authority of Thailand — destination pages', 'https://www.tourismthailand.org/'),
    src('wv-th-around', 'Wikivoyage Thailand — Get around (domestic)', `${WV}/Thailand#Get_around`),
  ],
  flightRoundtripEur: { low: 600, mid: 750, high: 1000, sourceId: 'wv-th-flight' },
  hotelPerNightEur: {
    budget: 20,
    mid: 40,
    comfort: 85,
    sourceId: 'wv-th',
    byArea: {
      Bangkok: { budget: 22, mid: 45, comfort: 95 },
      'Chiang Mai': { budget: 16, mid: 35, comfort: 70 },
      'Isole del Golfo (Samui / zona)': { budget: 25, mid: 50, comfort: 110 },
      'Isole del Golfo': { budget: 25, mid: 50, comfort: 110 },
      'Koh Samui': { budget: 25, mid: 50, comfort: 110 },
    },
  },
  dailyLivingPerPersonEur: {
    relax: { foodEur: 18, localTransportEur: 5, sourceId: 'wv-th' },
    divertimento: { foodEur: 25, localTransportEur: 8, sourceId: 'wv-th' },
    avventura: { foodEur: 22, localTransportEur: 12, sourceId: 'wv-th' },
  },
  transferEur: {
    internal_flight: 60,
    bus: 15,
    train: 22,
    ferry: 35,
    sourceId: 'wv-th-around',
  },
  activityEntryEur: {
    default: 15,
    sourceId: 'wv-th',
    byKeyword: [
      { match: /grand palace|wat pho|wat arun/i, amountEur: 18 },
      { match: /isola|snorkeling|diving/i, amountEur: 35 },
    ],
  },
};

/** Spagna — Wikivoyage Spain Costs (Western Europe mid-range). */
export const SPAGNA_COSTS: DestinationCostTable = {
  slug: 'spagna',
  nameIt: 'Spagna',
  retrievedOn: ON,
  sources: [
    src('wv-es', 'Wikivoyage Spain — Costs / mid-range', `${WV}/Spain`),
    src('wv-es-flight', 'Wikivoyage Spain — Getting there', `${WV}/Spain#Get_in`),
    src('wv-es-around', 'Wikivoyage Spain — Get around (AVE / buses)', `${WV}/Spain#Get_around`),
  ],
  flightRoundtripEur: { low: 80, mid: 140, high: 280, sourceId: 'wv-es-flight' },
  hotelPerNightEur: {
    budget: 45,
    mid: 85,
    comfort: 150,
    sourceId: 'wv-es',
    byArea: {
      Madrid: { budget: 50, mid: 95, comfort: 170 },
      Barcelona: { budget: 55, mid: 100, comfort: 180 },
      Sevilla: { budget: 40, mid: 80, comfort: 140 },
      Valencia: { budget: 40, mid: 78, comfort: 135 },
    },
  },
  dailyLivingPerPersonEur: {
    relax: { foodEur: 28, localTransportEur: 8, sourceId: 'wv-es' },
    divertimento: { foodEur: 38, localTransportEur: 12, sourceId: 'wv-es' },
    avventura: { foodEur: 32, localTransportEur: 15, sourceId: 'wv-es' },
  },
  transferEur: {
    internal_flight: 70,
    bus: 25,
    train: 55,
    ferry: 40,
    sourceId: 'wv-es-around',
  },
  activityEntryEur: {
    default: 18,
    sourceId: 'wv-es',
    byKeyword: [
      { match: /prado|alhambra|sagrada/i, amountEur: 22 },
      { match: /park\s*g[uü]ell|museo/i, amountEur: 16 },
    ],
  },
};

const DETAILED: Record<string, DestinationCostTable> = {
  vietnam: VIETNAM_COSTS,
  thailandia: THAILANDIA_COSTS,
  spagna: SPAGNA_COSTS,
};

/**
 * Fallback from master.budgetOrientativeEur / idealTripDays.
 * Explicitly attributed to catalog — never invents a new absolute.
 */
export function costTableFromMasterHints(input: {
  slug: string;
  nameIt: string;
  idealTripDays: number;
  flightsHint: number;
  hotelHint: number;
  foodHint: number;
  activitiesHint: number;
}): DestinationCostTable {
  const nights = Math.max(1, input.idealTripDays - 1);
  const midHotel = Math.max(15, Math.round(input.hotelHint / nights));
  const foodDay = Math.max(8, Math.round(input.foodHint / input.idealTripDays));
  const act = Math.max(5, Math.round(input.activitiesHint / Math.max(3, Math.floor(input.idealTripDays / 3))));
  const sourceId = 'catalog-master';
  return {
    slug: input.slug,
    nameIt: input.nameIt,
    retrievedOn: ON,
    sources: [
      src(
        sourceId,
        `Catalogo master Noivia — budgetOrientativeEur (${input.nameIt})`,
        'https://noivia.app',
        ON
      ),
    ],
    flightRoundtripEur: {
      low: Math.round(input.flightsHint * 0.85),
      mid: input.flightsHint,
      high: Math.round(input.flightsHint * 1.25),
      sourceId,
    },
    hotelPerNightEur: {
      budget: Math.round(midHotel * 0.55),
      mid: midHotel,
      comfort: Math.round(midHotel * 1.8),
      sourceId,
    },
    dailyLivingPerPersonEur: {
      relax: {
        foodEur: Math.round(foodDay * 0.85),
        localTransportEur: Math.max(3, Math.round(foodDay * 0.25)),
        sourceId,
      },
      divertimento: {
        foodEur: foodDay,
        localTransportEur: Math.max(4, Math.round(foodDay * 0.35)),
        sourceId,
      },
      avventura: {
        foodEur: Math.round(foodDay * 0.95),
        localTransportEur: Math.max(5, Math.round(foodDay * 0.4)),
        sourceId,
      },
    },
    transferEur: {
      internal_flight: 60,
      bus: 15,
      train: 30,
      ferry: 35,
      sourceId,
    },
    activityEntryEur: { default: act, sourceId },
  };
}

export function getDestinationCostTable(
  slug: string
): DestinationCostTable | null {
  return DETAILED[slug.trim().toLowerCase()] ?? null;
}

export function listDetailedCostTableSlugs(): string[] {
  return Object.keys(DETAILED);
}
