/**
 * Deterministic Thailand itinerary pilot.
 * Selects curated catalog templates + remaps duration; attaches provenance / unknowns.
 * Does not invent stops, fares, or transfer timings. Not a booking path.
 */

import {
  fitItineraryToDays,
  pickTemplateForTrip,
  type TripVibe,
} from '@/lib/itineraries/fit';
import type { ItineraryDay, ItineraryTemplate } from '@/lib/itineraries/types';
import {
  provenanceForAreaSegment,
  provenanceForPoiName,
  type ProvenanceRecord,
} from '@/lib/itineraries/thailand-pilot/provenance';

export const THAILAND_DESTINATION_SLUG = 'thailandia';

export type ThailandPlanWarningCode =
  | 'unsupported_destination'
  | 'impossible_duration'
  | 'unverified_transfer_timing'
  | 'unverified_poi'
  | 'budget_orientative_only'
  | 'seasonality_hint_only';

export type ThailandPlanWarning = {
  code: ThailandPlanWarningCode;
  message: string;
  dayNumber?: number;
};

export type AnnotatedPoi = {
  name: string;
  priority: 'core' | 'optional';
  half_or_full: 'half' | 'full';
  provenance: ProvenanceRecord | null;
  unknown: boolean;
};

export type AnnotatedDay = {
  day_number: number;
  title: string;
  description: string;
  area_segment: string;
  transfer: ItineraryDay['transfer'];
  is_arrival: boolean;
  is_departure: boolean;
  lat?: number;
  lng?: number;
  areaProvenance: ProvenanceRecord | null;
  pois: AnnotatedPoi[];
  transferTimingVerified: boolean;
};

export type ThailandPlanInput = {
  destinationSlug: string;
  tripDays: number;
  vibe?: TripVibe | null;
  /** 1–12; used only for TAT Koh Tao season tip when islands present. */
  travelMonth?: number | null;
  arrivalIata?: string | null;
  departureIata?: string | null;
};

export type ThailandPlanResult =
  | {
      ok: true;
      supported: true;
      templateId: string;
      durationDays: number;
      days: AnnotatedDay[];
      warnings: ThailandPlanWarning[];
      /** Orientative only — never treat as fare. */
      budgetOrientativeEur: ItineraryTemplate['budget_orientative_eur'];
      summary: string;
      logisticsNotes?: string;
      attributions: ProvenanceRecord[];
    }
  | {
      ok: false;
      supported: false;
      reason: ThailandPlanWarningCode;
      message: string;
      warnings: ThailandPlanWarning[];
    };

const TH_HUBS = new Set(['BKK', 'DMK', 'HKT', 'CNX', 'USM', 'UTP']);

function annotateDay(day: ItineraryDay): AnnotatedDay {
  const areaProvenance = provenanceForAreaSegment(day.area_segment);
  const pois: AnnotatedPoi[] = day.pois.map((p) => {
    const provenance = provenanceForPoiName(p.name);
    return {
      name: p.name,
      priority: p.priority,
      half_or_full: p.half_or_full,
      provenance,
      unknown: provenance == null,
    };
  });
  const transfer = day.transfer ?? 'none';
  return {
    day_number: day.day_number,
    title: day.title,
    description: day.description,
    area_segment: day.area_segment,
    transfer,
    is_arrival: day.is_arrival,
    is_departure: day.is_departure,
    lat: day.lat,
    lng: day.lng,
    areaProvenance,
    pois,
    // Geography ≠ travel time: we never claim verified schedules.
    transferTimingVerified: transfer === 'none',
  };
}

function collectAttributions(days: AnnotatedDay[]): ProvenanceRecord[] {
  const map = new Map<string, ProvenanceRecord>();
  for (const d of days) {
    if (d.areaProvenance) map.set(d.areaProvenance.id, d.areaProvenance);
    for (const p of d.pois) {
      if (p.provenance) map.set(p.provenance.id, p.provenance);
    }
  }
  return [...map.values()];
}

/**
 * Plan a Thailand itinerary from curated verified catalog data only.
 */
export function planThailandDeterministic(input: ThailandPlanInput): ThailandPlanResult {
  const slug = input.destinationSlug.trim().toLowerCase();
  if (slug !== THAILAND_DESTINATION_SLUG) {
    return {
      ok: false,
      supported: false,
      reason: 'unsupported_destination',
      message:
        'Il piano deterministico pilotato copre solo la Thailandia. Altre destinazioni: template curato esistente o «non supportato».',
      warnings: [
        {
          code: 'unsupported_destination',
          message: `Destinazione «${input.destinationSlug}» fuori dal pilot Thailandia.`,
        },
      ],
    };
  }

  if (!Number.isFinite(input.tripDays) || input.tripDays < 2) {
    return {
      ok: false,
      supported: false,
      reason: 'impossible_duration',
      message: 'Servono almeno 2 giorni (arrivo + partenza).',
      warnings: [
        {
          code: 'impossible_duration',
          message: `Durata impossibile: ${input.tripDays}`,
        },
      ],
    };
  }

  const base = pickTemplateForTrip(THAILAND_DESTINATION_SLUG, input.tripDays, input.vibe);
  if (!base) {
    return {
      ok: false,
      supported: false,
      reason: 'unsupported_destination',
      message: 'Nessun template Thailandia pubblicato in catalogo.',
      warnings: [{ code: 'unsupported_destination', message: 'Catalogo Thailandia vuoto.' }],
    };
  }

  const fittedDays =
    input.tripDays === base.duration_days
      ? base.days
      : fitItineraryToDays(base, input.tripDays);

  const days = fittedDays.map(annotateDay);
  const warnings: ThailandPlanWarning[] = [
    {
      code: 'budget_orientative_only',
      message:
        'Budget orientativo del template: non è un prezzo del viaggio né un fare verificato.',
    },
  ];

  for (const d of days) {
    if (d.transfer && d.transfer !== 'none' && !d.transferTimingVerified) {
      warnings.push({
        code: 'unverified_transfer_timing',
        dayNumber: d.day_number,
        message: `Trasferimento «${d.transfer}» giorno ${d.day_number}: timing/costo non verificati (geografia ≠ tempo di viaggio).`,
      });
    }
    for (const p of d.pois) {
      if (p.unknown) {
        warnings.push({
          code: 'unverified_poi',
          dayNumber: d.day_number,
          message: `POI «${p.name}» senza fonte strutturata verificata in questo pilot.`,
        });
      }
    }
  }

  const month = input.travelMonth;
  const visitsIslands = days.some((d) => /island|isole|samui|tao/i.test(d.area_segment));
  if (visitsIslands && month != null && (month < 2 || month > 4)) {
    warnings.push({
      code: 'seasonality_hint_only',
      message:
        'TAT indica Feb–Apr come periodo migliore per Koh Tao; fuori da quella finestra le condizioni mare non sono verificate qui.',
    });
  }

  const arrival = input.arrivalIata?.trim().toUpperCase();
  const departure = input.departureIata?.trim().toUpperCase();
  if (arrival && !TH_HUBS.has(arrival)) {
    warnings.push({
      code: 'unverified_transfer_timing',
      message: `Hub arrivo ${arrival} non è tra gli IATA Thailandia curati del catalogo; collegamento non verificato.`,
    });
  }
  if (departure && !TH_HUBS.has(departure)) {
    warnings.push({
      code: 'unverified_transfer_timing',
      message: `Hub partenza ${departure} non è tra gli IATA Thailandia curati del catalogo; collegamento non verificato.`,
    });
  }

  return {
    ok: true,
    supported: true,
    templateId: base.template_id,
    durationDays: days.length,
    days,
    warnings,
    budgetOrientativeEur: base.budget_orientative_eur,
    summary: `${base.summary.split('.')[0]}. Piano deterministico su ${days.length} giorni (template ${base.template_id}).`,
    logisticsNotes: base.logistics_notes,
    attributions: collectAttributions(days),
  };
}
