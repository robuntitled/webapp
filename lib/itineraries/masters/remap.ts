/**
 * Remap a destination master into a day-by-day itinerary.
 * Compress/extend by priority, respect nightsMin, avoid backtracking,
 * arrival/departure near hubs, pace by travel style.
 */

import type { ItineraryDay, ItineraryTemplate } from '@/lib/itineraries/types';
import type {
  DestinationMaster,
  MasterStop,
  StopPriority,
  TransferMode,
} from '@/lib/itineraries/masters/types';

export type RemapVibe = 'relax' | 'divertimento' | 'avventura';

export type RemapGap = {
  kind: 'transfer' | 'activity' | 'coverage' | 'budget';
  text: string;
};

export type RemapResult = {
  template: ItineraryTemplate;
  gaps: RemapGap[];
  quality: 'curated';
};

type AllocatedStop = {
  stop: MasterStop;
  nights: number;
};

function vibeBias(vibe: RemapVibe | null | undefined): {
  preferFewerStops: boolean;
  stretchNights: boolean;
} {
  if (vibe === 'relax') return { preferFewerStops: true, stretchNights: true };
  if (vibe === 'avventura') return { preferFewerStops: false, stretchNights: false };
  return { preferFewerStops: false, stretchNights: true };
}

function transferAsDayTransfer(mode: TransferMode): ItineraryDay['transfer'] {
  if (mode === 'train' || mode === 'bus') return 'bus';
  if (mode === 'internal_flight') return 'internal_flight';
  if (mode === 'ferry') return 'ferry';
  return 'none';
}

function transferLabelIt(mode: TransferMode): string {
  switch (mode) {
    case 'internal_flight':
      return 'volo interno';
    case 'ferry':
      return 'traghetto';
    case 'train':
      return 'treno';
    case 'bus':
      return 'strada / bus';
    default:
      return '';
  }
}

/**
 * Select which stops fit the day budget and assign nights.
 * Trip days = arrival day + sum(nights) + departure day roughly:
 * we model: day1 arrival at first stop (counts as soft night), then nights-1 more full days,
 * transfer days consume a day when transfer is long, last day departure.
 *
 * Practical model used here:
 * - usable nights = tripDays - 1 (departure morning) but arrival day is soft exploration
 * - allocate nights per stop; insert transfer days between stops when mode !== none
 */
export function allocateStops(
  master: DestinationMaster,
  tripDays: number,
  vibe?: RemapVibe | null
): { allocated: AllocatedStop[]; gaps: RemapGap[] } {
  const gaps: RemapGap[] = [];
  const bias = vibeBias(vibe);
  const targetNights = Math.max(1, tripDays - 1); // night of arrival through night before departure

  let pool = [...master.stops];

  // Drop optional first, then extend, never drop last remaining core if possible
  const dropOrder: StopPriority[] = bias.preferFewerStops
    ? ['optional', 'extend']
    : ['optional', 'extend'];

  function nightsSum(list: AllocatedStop[]) {
    return list.reduce((s, a) => s + a.nights, 0);
  }

  function withIdeal(list: MasterStop[]): AllocatedStop[] {
    return list.map((stop) => ({
      stop,
      nights: bias.stretchNights ? stop.nightsIdeal : Math.max(stop.nightsMin, stop.nightsIdeal - 1),
    }));
  }

  let allocated = withIdeal(pool);

  // Drop stops until ideal/min fit
  while (nightsSum(allocated) > targetNights && allocated.length > 1) {
    // First reduce nights toward min
    let reduced = false;
    for (let i = allocated.length - 1; i >= 0; i--) {
      const a = allocated[i]!;
      if (a.nights > a.stop.nightsMin) {
        a.nights -= 1;
        reduced = true;
        if (nightsSum(allocated) <= targetNights) break;
      }
    }
    if (nightsSum(allocated) <= targetNights) break;
    if (reduced) continue;

    // Drop by priority (prefer dropping from middle/end, keep first hub + last hub)
    let dropped = false;
    for (const prio of dropOrder) {
      for (let i = allocated.length - 2; i >= 1; i--) {
        if (allocated[i]!.stop.priority === prio) {
          allocated.splice(i, 1);
          dropped = true;
          break;
        }
      }
      if (dropped) break;
    }
    if (!dropped) {
      // Must drop an end extend/optional if stuck
      for (const prio of dropOrder) {
        const idx = allocated.findIndex(
          (a, i) => a.stop.priority === prio && i > 0 && i < allocated.length - 1
        );
        if (idx >= 0) {
          allocated.splice(idx, 1);
          dropped = true;
          break;
        }
      }
    }
    if (!dropped) break;
  }

  // Ensure at least one airport hub first if possible
  const hubIdx = allocated.findIndex((a) => a.stop.airportHub);
  if (hubIdx > 0) {
    const [hub] = allocated.splice(hubIdx, 1);
    if (hub) allocated.unshift(hub);
  }

  // Extend nights if short
  while (nightsSum(allocated) < targetNights) {
    let grew = false;
    const order = bias.stretchNights
      ? [...allocated].sort((a, b) => b.stop.nightsIdeal - a.stop.nightsIdeal)
      : [...allocated];
    for (const a of order) {
      if (nightsSum(allocated) >= targetNights) break;
      // Cap stretch: ideal + 2 for relax, ideal + 1 otherwise
      const cap = a.stop.nightsIdeal + (bias.stretchNights ? 2 : 1);
      if (a.nights < cap) {
        a.nights += 1;
        grew = true;
      }
    }
    if (!grew) {
      // Add optional stops that were dropped if master has them and days remain
      const used = new Set(allocated.map((a) => a.stop.id));
      const candidate = master.stops.find(
        (s) => !used.has(s.id) && (s.priority === 'optional' || s.priority === 'extend')
      );
      if (candidate && !bias.preferFewerStops) {
        // Insert before last if last is hub, else append before end
        const insertAt = Math.max(1, allocated.length - 1);
        allocated.splice(insertAt, 0, {
          stop: candidate,
          nights: candidate.nightsMin,
        });
        grew = true;
      }
    }
    if (!grew) {
      gaps.push({
        kind: 'coverage',
        text: `Con ${tripDays} giorni restano notti da riempire in loco: abbiamo allungato le basi senza inventare nuove tappe.`,
      });
      // Force pad on first stop
      if (allocated[0]) allocated[0].nights += targetNights - nightsSum(allocated);
      break;
    }
  }

  if (allocated.length === 0) {
    gaps.push({ kind: 'coverage', text: 'Nessuna tappa allocabile per questa durata.' });
  }

  return { allocated, gaps };
}

export function remapMasterToDays(
  master: DestinationMaster,
  tripDays: number,
  vibe?: RemapVibe | null
): { days: ItineraryDay[]; gaps: RemapGap[] } {
  const { allocated, gaps } = allocateStops(master, tripDays, vibe);
  const days: ItineraryDay[] = [];
  let dayNum = 1;

  for (let i = 0; i < allocated.length; i++) {
    const { stop, nights } = allocated[i]!;
    const isFirst = i === 0;
    const isLast = i === allocated.length - 1;

    // Arrival / first soft day
    if (isFirst) {
      days.push({
        day_number: dayNum++,
        title: `Arrivo a ${stop.nameIt}`,
        description: `Check-in e ritmo soft. ${stop.descriptionIt}`,
        area_segment: stop.nameIt,
        pois: [
          { name: 'Arrivo e sistemazione', priority: 'core', half_or_full: 'half' },
          ...stop.sights
            .filter((s) => s.priority === 'core')
            .slice(0, 1)
            .map((s) => ({
              name: s.nameIt,
              priority: 'optional' as const,
              half_or_full: 'half' as const,
            })),
        ],
        transfer: 'none',
        is_arrival: true,
        is_departure: false,
        lat: stop.lat,
        lng: stop.lng,
      });
    }

    // Full days at stop (nights - 1 more exploration days if first already counted; else nights days)
    const exploreDays = isFirst ? Math.max(0, nights - 1) : nights;
    for (let n = 0; n < exploreDays; n++) {
      if (isLast && n === exploreDays - 1 && dayNum >= tripDays) break;
      const coreSights = stop.sights.filter((s) => s.priority === 'core');
      const optSights = stop.sights.filter((s) => s.priority === 'optional');
      const pick = [
        ...coreSights.slice(n % Math.max(1, coreSights.length), (n % Math.max(1, coreSights.length)) + 2),
        ...(vibe === 'relax' ? [] : optSights.slice(0, 1)),
      ];
      const unique = [...new Map(pick.map((s) => [s.nameIt, s])).values()];
      days.push({
        day_number: dayNum++,
        title: `${stop.nameIt}: ${unique[0]?.nameIt ?? 'esplorazione'}`,
        description: stop.descriptionIt,
        area_segment: stop.nameIt,
        pois:
          unique.length > 0
            ? unique.map((s) => ({
                name: s.nameIt,
                priority: s.priority,
                half_or_full: 'full' as const,
              }))
            : [{ name: 'Esplorazione in zona', priority: 'core', half_or_full: 'full' }],
        transfer: 'none',
        is_arrival: false,
        is_departure: false,
        lat: stop.lat,
        lng: stop.lng,
      });
      if (dayNum > tripDays - (isLast ? 0 : 1)) break;
    }

    // Transfer day to next
    if (!isLast && stop.transferToNext && stop.transferToNext.mode !== 'none') {
      const next = allocated[i + 1]!;
      const t = stop.transferToNext;
      const label = transferLabelIt(t.mode);
      if (!t.verified || t.durationHours == null) {
        gaps.push({
          kind: 'transfer',
          text: `Trasferimento ${stop.nameIt} → ${next.stop.nameIt} (${label}): orari/costi da verificare prima di prenotare.`,
        });
      } else {
        gaps.push({
          kind: 'transfer',
          text: `Trasferimento ${stop.nameIt} → ${next.stop.nameIt}: circa ${t.durationHours} h in ${label} — conferma orari aggiornati.`,
        });
      }
      // Only spend a full day if transfer is long (>= 4h) or flight/ferry
      const long =
        t.mode === 'internal_flight' ||
        t.mode === 'ferry' ||
        (t.durationHours != null && t.durationHours >= 4);
      if (long && dayNum < tripDays) {
        days.push({
          day_number: dayNum++,
          title: `Verso ${next.stop.nameIt}`,
          description:
            t.notesIt?.trim() ||
            `Giorno di trasferimento (${label}). Tieni margine: ritardi e check-in possono mangiare la giornata.`,
          area_segment: next.stop.nameIt,
          pois: [{ name: `Trasferimento in ${label}`, priority: 'core', half_or_full: 'full' }],
          transfer: transferAsDayTransfer(t.mode),
          is_arrival: false,
          is_departure: false,
          lat: next.stop.lat,
          lng: next.stop.lng,
        });
      }
    }
  }

  // Ensure departure day
  const lastStop = allocated[allocated.length - 1]?.stop ?? master.stops[0]!;
  while (days.length > tripDays) days.pop();
  if (days.length < tripDays) {
    // pad buffer days at last stop before departure
    while (days.length < tripDays - 1) {
      days.push({
        day_number: days.length + 1,
        title: `Tempo libero a ${lastStop.nameIt}`,
        description: 'Giorno di margine: riposo, eventuali visite rimaste o buffer prima del rientro.',
        area_segment: lastStop.nameIt,
        pois: [{ name: 'Tempo libero', priority: 'optional', half_or_full: 'full' }],
        transfer: 'none',
        is_arrival: false,
        is_departure: false,
        lat: lastStop.lat,
        lng: lastStop.lng,
      });
    }
  }

  // Force last day departure
  if (days.length === tripDays) {
    const last = days[days.length - 1]!;
    days[days.length - 1] = {
      ...last,
      title: 'Partenza',
      description: `Rientro da ${lastStop.nameIt}. Mattina libera solo se l’orario del volo lo permette.`,
      area_segment: lastStop.nameIt,
      pois: [{ name: 'Volo / rientro', priority: 'core', half_or_full: 'half' }],
      is_arrival: false,
      is_departure: true,
      lat: lastStop.lat,
      lng: lastStop.lng,
    };
  } else {
    days.push({
      day_number: tripDays,
      title: 'Partenza',
      description: `Rientro da ${lastStop.nameIt}. Mattina libera solo se l’orario del volo lo permette.`,
      area_segment: lastStop.nameIt,
      pois: [{ name: 'Volo / rientro', priority: 'core', half_or_full: 'half' }],
      transfer: 'none',
      is_arrival: false,
      is_departure: true,
      lat: lastStop.lat,
      lng: lastStop.lng,
    });
  }

  // Renumber
  const normalized = days.slice(0, tripDays).map((d, i) => ({ ...d, day_number: i + 1 }));
  if (!normalized[0]?.is_arrival && normalized[0]) {
    normalized[0] = { ...normalized[0], is_arrival: true };
  }
  const lastIdx = normalized.length - 1;
  if (lastIdx >= 0) {
    normalized[lastIdx] = {
      ...normalized[lastIdx]!,
      is_departure: true,
      is_arrival: lastIdx === 0 ? true : false,
      title: lastIdx === 0 ? normalized[lastIdx]!.title : 'Partenza',
    };
  }

  // Sight provenance gaps (once per unverified sight used)
  const usedUnverified = new Set<string>();
  for (const d of normalized) {
    for (const p of d.pois) {
      const sight = master.stops
        .flatMap((s) => s.sights.map((x) => ({ ...x, stop: s.nameIt })))
        .find((s) => s.nameIt === p.name);
      if (sight && !sight.provenanceId && !usedUnverified.has(sight.nameIt)) {
        usedUnverified.add(sight.nameIt);
      }
    }
  }
  if (usedUnverified.size > 0) {
    gaps.push({
      kind: 'activity',
      text: `Alcune attività («${[...usedUnverified].slice(0, 3).join('», «')}»${
        usedUnverified.size > 3 ? '…' : ''
      }) sono indicative: orari e biglietti da confermare in loco.`,
    });
  }

  gaps.push({
    kind: 'budget',
    text: 'Il budget indicato è solo orientativo: non è un prezzo del viaggio né un fare verificato.',
  });

  return { days: normalized, gaps };
}

export function remapMasterToTemplate(
  master: DestinationMaster,
  tripDays: number,
  vibe?: RemapVibe | null
): RemapResult {
  const { days, gaps } = remapMasterToDays(master, tripDays, vibe);
  const style =
    vibe === 'avventura' ? 'avventura' : vibe === 'divertimento' ? 'entertainment' : 'relax';

  const hotels = [...new Set(days.map((d) => d.area_segment))].map((area) => ({
    area_segment: area,
    name_or_zone: `Zona comoda a ${area}`,
    notes: 'Ognuno prenota la propria camera.',
  }));

  // Scale orientative budget gently with duration vs ideal (never invent fares).
  const scale = Math.max(0.7, Math.min(1.35, days.length / Math.max(1, master.idealTripDays)));
  const b = master.budgetOrientativeEur;
  const budget_orientative_eur = {
    flights_hint: Math.round(b.flights_hint),
    hotel_hint: Math.round(b.hotel_hint * scale),
    activities_hint: Math.round(b.activities_hint * scale),
    food_hint: Math.round(b.food_hint * scale),
    total_hint: Math.round(
      b.flights_hint + (b.hotel_hint + b.activities_hint + b.food_hint) * scale
    ),
  };

  const template: ItineraryTemplate = {
    // Stable ids for catalog/editions (thailandia-10d, vietnam-14d, …)
    template_id: `${master.slug}-${days.length}d`,
    destination_slug: master.slug,
    destination_name: master.nameIt,
    duration_days: days.length,
    style,
    title: `${master.nameIt} ${days.length} giorni`,
    summary: `${master.summaryIt} Piano adattato a ${days.length} giorni.`,
    budget_orientative_eur,
    days,
    hotels,
    paid_activities: [],
    logistics_notes: master.logisticsNotesIt,
    status: 'published',
    hub_iata: master.hubs[0],
  };

  return { template, gaps, quality: 'curated' };
}
