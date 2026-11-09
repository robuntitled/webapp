/**
 * Build budget from the remapped itinerary + sourced cost table.
 * Live fares/hotels override estimates when provided.
 *
 * Avoids importing planFromMaster / remapMasterToTemplate to prevent cycles:
 * callers pass days (and optional allocated nights) after remapping.
 */

import { getMaster } from '@/lib/itineraries/masters/registry';
import type { TransferMode } from '@/lib/itineraries/masters/types';
import type { ItineraryDay } from '@/lib/itineraries/types';
import {
  costTableFromMasterHints,
  getDestinationCostTable,
} from '@/lib/itineraries/budget/cost-tables';
import {
  asRemapVibe,
  hotelTierFromVibe,
  partyFromCompany,
  type BudgetParty,
} from '@/lib/itineraries/budget/party';
import type {
  BudgetBreakdown,
  BudgetCategoryId,
  BudgetLine,
  BudgetPriceKind,
  DestinationCostTable,
  HotelTier,
  NightlyRateBand,
} from '@/lib/itineraries/budget/types';
import type { OrganizzaCompanyChoice } from '@/lib/itineraries/organizza-steps';
import type { RemapVibe } from '@/lib/itineraries/masters/remap';

export type ComputeBudgetInput = {
  destinationSlug: string;
  tripDays: number;
  vibe?: string | null;
  company?: OrganizzaCompanyChoice | null;
  party?: Partial<BudgetParty>;
  /** Remapped day list (preferred). */
  days?: ItineraryDay[];
  /** Chosen outbound+return fare (EUR, per person). */
  liveFlightEurPerPerson?: number | null;
  /** Live hotel rates by area label (EUR / room / night). */
  liveHotelPerNightByArea?: Record<string, number> | null;
};

const CATEGORY_LABEL: Record<BudgetCategoryId, string> = {
  flights: 'Voli',
  hotels: 'Alloggi',
  internal_transfers: 'Spostamenti interni',
  daily_living: 'Vita quotidiana',
  activities: 'Attività',
};

function pickNightly(band: NightlyRateBand, tier: HotelTier): number {
  return band[tier];
}

function resolveAreaRate(
  table: DestinationCostTable,
  area: string,
  tier: HotelTier
): number {
  const byArea = table.hotelPerNightEur.byArea;
  if (byArea) {
    const exact = byArea[area];
    if (exact) return pickNightly(exact, tier);
    const key = Object.keys(byArea).find(
      (k) =>
        area.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(area.toLowerCase())
    );
    if (key) return pickNightly(byArea[key]!, tier);
  }
  return pickNightly(table.hotelPerNightEur, tier);
}

function nightsByAreaFromDays(days: ItineraryDay[], tripDays: number): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of days) {
    if (d.is_departure) continue;
    const area = d.area_segment || 'Zona';
    map.set(area, (map.get(area) ?? 0) + 1);
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  const target = Math.max(1, tripDays - 1);
  if (total > target) {
    let excess = total - target;
    for (const k of [...map.keys()].reverse()) {
      if (excess <= 0) break;
      const cur = map.get(k) ?? 0;
      const cut = Math.min(cur, excess);
      map.set(k, cur - cut);
      excess -= cut;
      if ((map.get(k) ?? 0) <= 0) map.delete(k);
    }
  }
  return map;
}

function transferAmount(
  table: DestinationCostTable,
  mode: TransferMode
): number | null {
  if (mode === 'none') return 0;
  const v = table.transferEur[mode];
  return typeof v === 'number' ? v : null;
}

function activityAmount(table: DestinationCostTable, name: string): number {
  for (const rule of table.activityEntryEur.byKeyword ?? []) {
    if (rule.match.test(name)) return rule.amountEur;
  }
  return table.activityEntryEur.default;
}

function resolveTable(slug: string): DestinationCostTable | null {
  const detailed = getDestinationCostTable(slug);
  if (detailed) return detailed;
  const master = getMaster(slug);
  if (!master) return null;
  return costTableFromMasterHints({
    slug: master.slug,
    nameIt: master.nameIt,
    idealTripDays: master.idealTripDays,
    flightsHint: master.budgetOrientativeEur.flights_hint,
    hotelHint: master.budgetOrientativeEur.hotel_hint,
    foodHint: master.budgetOrientativeEur.food_hint,
    activitiesHint: master.budgetOrientativeEur.activities_hint,
  });
}

function rollup(lines: BudgetLine[]): BudgetBreakdown['byCategory'] {
  const empty = (labelIt: string) => ({
    amountEur: null as number | null,
    kind: 'unknown' as BudgetPriceKind,
    labelIt,
  });
  const out: BudgetBreakdown['byCategory'] = {
    flights: empty(CATEGORY_LABEL.flights),
    hotels: empty(CATEGORY_LABEL.hotels),
    internal_transfers: empty(CATEGORY_LABEL.internal_transfers),
    daily_living: empty(CATEGORY_LABEL.daily_living),
    activities: empty(CATEGORY_LABEL.activities),
  };

  for (const line of lines) {
    const slot = out[line.category];
    if (line.amountEur == null) {
      if (slot.amountEur == null) slot.kind = 'unknown';
      continue;
    }
    slot.amountEur = (slot.amountEur ?? 0) + line.amountEur;
    if (slot.kind === 'unknown') slot.kind = line.kind;
    else if (slot.kind !== line.kind && line.kind !== 'unknown') {
      slot.kind = 'estimate';
    }
  }
  return out;
}

export function computeItineraryBudget(
  input: ComputeBudgetInput
): BudgetBreakdown | null {
  const slug = input.destinationSlug.trim().toLowerCase();
  const tripDays = Math.max(2, Math.floor(input.tripDays));
  const vibe = asRemapVibe(input.vibe);
  const table = resolveTable(slug);
  if (!table) return null;

  const baseParty = partyFromCompany(input.company);
  const travelers = Math.max(1, input.party?.travelers ?? baseParty.travelers);
  const rooms = Math.max(1, input.party?.rooms ?? baseParty.rooms);
  const tier = hotelTierFromVibe(vibe ?? 'divertimento');
  const nights = tripDays - 1;
  const days = input.days ?? [];

  const lines: BudgetLine[] = [];
  const usedSourceIds = new Set<string>();

  // —— Flights ——
  if (input.liveFlightEurPerPerson != null && input.liveFlightEurPerPerson > 0) {
    const unit = Math.round(input.liveFlightEurPerPerson);
    lines.push({
      id: 'flights-live',
      category: 'flights',
      labelIt: 'Volo A/R (tariffa scelta)',
      amountEur: unit * travelers,
      kind: 'live',
      detailIt: `${travelers}× ${unit} €`,
    });
  } else {
    const f = table.flightRoundtripEur;
    usedSourceIds.add(f.sourceId);
    lines.push({
      id: 'flights-est',
      category: 'flights',
      labelIt: 'Volo A/R (stima)',
      amountEur: Math.round(f.mid * travelers),
      kind: 'estimate',
      detailIt: `Fascia ${f.low}–${f.high} € a persona · usato ${f.mid} €`,
      sourceIds: [f.sourceId],
    });
  }

  // —— Hotels (from remapped days: night per non-departure day) ——
  const areaNights = days.length
    ? nightsByAreaFromDays(days, tripDays)
    : null;

  if (!areaNights || areaNights.size === 0) {
    lines.push({
      id: 'hotels-unknown',
      category: 'hotels',
      labelIt: 'Alloggi',
      amountEur: null,
      kind: 'unknown',
      detailIt: 'da verificare',
    });
  } else {
    let hotelTotal = 0;
    let hotelLive = false;
    const hotelDetails: string[] = [];
    for (const [area, n] of areaNights) {
      if (n <= 0) continue;
      const live = input.liveHotelPerNightByArea?.[area];
      if (live != null && live > 0) {
        hotelTotal += live * n * rooms;
        hotelLive = true;
        hotelDetails.push(`${area}: ${n} notti × ${Math.round(live)} €`);
      } else {
        const rate = resolveAreaRate(table, area, tier);
        hotelTotal += rate * n * rooms;
        hotelDetails.push(`${area}: ${n} notti × ${rate} € (${tier})`);
        usedSourceIds.add(table.hotelPerNightEur.sourceId);
      }
    }
    lines.push({
      id: hotelLive ? 'hotels-live' : 'hotels-est',
      category: 'hotels',
      labelIt: hotelLive ? 'Alloggi (tariffe scelte)' : 'Alloggi (stima)',
      amountEur: Math.round(hotelTotal),
      kind: hotelLive ? 'live' : 'estimate',
      detailIt: `${rooms} camera/e · ${hotelDetails.slice(0, 4).join(' · ')}`,
      sourceIds: hotelLive ? undefined : [table.hotelPerNightEur.sourceId],
    });
  }

  // —— Internal transfers (from remapped day.transfer) ——
  let transferTotal = 0;
  let transferCount = 0;
  let transferUnknown = false;
  const master = getMaster(slug);
  for (const d of days) {
    const mode = (d.transfer ?? 'none') as TransferMode;
    if (mode === 'none') continue;
    const amt = transferAmount(table, mode);
    if (amt == null || amt === 0) {
      transferUnknown = true;
      continue;
    }
    transferTotal += amt * travelers;
    transferCount += 1;
  }
  usedSourceIds.add(table.transferEur.sourceId);

  if (transferCount === 0 && !transferUnknown) {
    lines.push({
      id: 'transfers-none',
      category: 'internal_transfers',
      labelIt: 'Spostamenti interni',
      amountEur: 0,
      kind: 'estimate',
      detailIt: 'Nessun trasferimento tra basi in questo piano',
    });
  } else if (transferUnknown && transferCount === 0) {
    lines.push({
      id: 'transfers-unknown',
      category: 'internal_transfers',
      labelIt: 'Spostamenti interni',
      amountEur: null,
      kind: 'unknown',
      detailIt: 'da verificare',
    });
  } else {
    lines.push({
      id: 'transfers-est',
      category: 'internal_transfers',
      labelIt: 'Spostamenti interni (stima)',
      amountEur: Math.round(transferTotal),
      kind: 'estimate',
      detailIt: `${transferCount} trasferimento/i · ${travelers} pax`,
      sourceIds: [table.transferEur.sourceId],
    });
  }

  // —— Daily living ——
  const styleKey = (vibe ?? 'divertimento') as 'relax' | 'divertimento' | 'avventura';
  const living = table.dailyLivingPerPersonEur[styleKey];
  usedSourceIds.add(living.sourceId);
  const livingPerDay = living.foodEur + living.localTransportEur;
  lines.push({
    id: 'living-est',
    category: 'daily_living',
    labelIt: 'Vita quotidiana (stima)',
    amountEur: Math.round(livingPerDay * tripDays * travelers),
    kind: 'estimate',
    detailIt: `${living.foodEur} € cibo + ${living.localTransportEur} € trasporti locali × ${tripDays} g × ${travelers}`,
    sourceIds: [living.sourceId],
  });

  // —— Activities ——
  let actTotal = 0;
  let actCount = 0;
  const seen = new Set<string>();
  for (const d of days) {
    for (const poi of d.pois) {
      if (poi.priority === 'optional' && styleKey === 'relax') continue;
      const key = poi.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      actTotal += activityAmount(table, poi.name) * travelers;
      actCount += 1;
    }
  }
  const cap = Math.max(1, Math.ceil(tripDays * 1.2));
  if (actCount > cap && actCount > 0) {
    actTotal = (actTotal / actCount) * cap;
    actCount = cap;
  }
  usedSourceIds.add(table.activityEntryEur.sourceId);
  if (actCount === 0) {
    // Still show a modest destination activity allowance when days exist but POIs empty
    if (days.length === 0 && master) {
      lines.push({
        id: 'activities-unknown',
        category: 'activities',
        labelIt: 'Attività',
        amountEur: null,
        kind: 'unknown',
        detailIt: 'da verificare',
      });
    } else {
      lines.push({
        id: 'activities-est-min',
        category: 'activities',
        labelIt: 'Attività / ingressi (stima)',
        amountEur: Math.round(table.activityEntryEur.default * Math.max(1, Math.floor(tripDays / 3)) * travelers),
        kind: 'estimate',
        detailIt: `Allowance minima · ${travelers} pax`,
        sourceIds: [table.activityEntryEur.sourceId],
      });
    }
  } else {
    lines.push({
      id: 'activities-est',
      category: 'activities',
      labelIt: 'Attività / ingressi (stima)',
      amountEur: Math.round(actTotal),
      kind: 'estimate',
      detailIt: `${actCount} voci nel piano · ${travelers} pax`,
      sourceIds: [table.activityEntryEur.sourceId],
    });
  }

  const knownAmounts = lines
    .map((l) => l.amountEur)
    .filter((n): n is number => n != null);
  const totalEur =
    knownAmounts.length > 0 ? knownAmounts.reduce((a, b) => a + b, 0) : null;
  const hasUnknown = lines.some((l) => l.kind === 'unknown' || l.amountEur == null);
  const sources = table.sources.filter((s) => usedSourceIds.has(s.id));

  return {
    destinationSlug: slug,
    tripDays,
    nights,
    travelers,
    rooms,
    vibe,
    lines,
    sources,
    totalEur,
    perPersonEur: totalEur != null ? Math.round(totalEur / travelers) : null,
    hasUnknown,
    byCategory: rollup(lines),
  };
}

/** Compact hints compatible with ItineraryTemplate.budget_orientative_eur (per person). */
export function budgetHintsFromBreakdown(b: BudgetBreakdown | null): {
  flights_hint: number;
  hotel_hint: number;
  activities_hint: number;
  food_hint: number;
  total_hint: number;
} {
  if (!b || b.totalEur == null) {
    return {
      flights_hint: 0,
      hotel_hint: 0,
      activities_hint: 0,
      food_hint: 0,
      total_hint: 0,
    };
  }
  const per = b.travelers > 0 ? 1 / b.travelers : 1;
  const cat = b.byCategory;
  return {
    flights_hint: Math.round((cat.flights.amountEur ?? 0) * per),
    hotel_hint: Math.round((cat.hotels.amountEur ?? 0) * per),
    activities_hint: Math.round(
      ((cat.activities.amountEur ?? 0) + (cat.internal_transfers.amountEur ?? 0)) * per
    ),
    food_hint: Math.round((cat.daily_living.amountEur ?? 0) * per),
    total_hint: Math.round(b.perPersonEur ?? b.totalEur),
  };
}

export function kindLabelIt(kind: BudgetPriceKind): string {
  if (kind === 'live') return 'prezzo live';
  if (kind === 'estimate') return 'stima';
  return 'da verificare';
}
