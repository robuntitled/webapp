/**
 * Deterministic planner: curated masters (preferred) → Thailand legacy path → skeleton.
 */

import {
  findCatalogDestination,
  wizardCatalogDestinations,
} from '@/lib/catalog/destinations';
import { templatesForDestination } from '@/lib/itineraries/catalog';
import {
  hasCuratedMaster,
  planFromMaster,
  getMaster,
} from '@/lib/itineraries/masters';
import type { TripVibe } from '@/lib/itineraries/fit';
import {
  groupGaps,
  humanizeArea,
  humanizeDayTitle,
  humanizePoiName,
  transferLabelIt,
  attributionClaimIt,
  type GapItem,
} from '@/lib/itineraries/deterministic-planner/humanize';
import {
  buildSkeletonDays,
  skeletonProvenance,
  type PlanQuality,
} from '@/lib/itineraries/deterministic-planner/skeleton';
import type { ProvenanceRecord } from '@/lib/itineraries/thailand-pilot/provenance';

export type PresentedDay = {
  dayNumber: number;
  title: string;
  description: string;
  area: string;
  transferLabel: string;
  isArrival: boolean;
  isDeparture: boolean;
  lat?: number;
  lng?: number;
  activities: string[];
};

export type PresentedPlan =
  | {
      ok: true;
      quality: PlanQuality;
      destinationSlug: string;
      destinationName: string;
      durationDays: number;
      templateId: string | null;
      summary: string;
      days: PresentedDay[];
      gaps: ReturnType<typeof groupGaps>;
      attributions: Array<{
        attribution: string;
        claimIt: string;
        sourceUrl: string;
        retrievedOn: string;
      }>;
      budgetTotalHint: number | null;
      logisticsNotes?: string;
      disclaimer: string;
    }
  | {
      ok: false;
      reason: string;
      message: string;
    };

export type PlanDestinationInput = {
  destinationSlug: string;
  tripDays: number;
  vibe?: string | null;
  travelMonth?: number | null;
  arrivalIata?: string | null;
  departureIata?: string | null;
};

function asTripVibe(vibe: string | null | undefined): TripVibe | null {
  if (vibe === 'relax' || vibe === 'divertimento' || vibe === 'avventura') return vibe;
  return null;
}

function presentMasterPlan(
  slug: string,
  tripDays: number,
  vibe: TripVibe | null,
  arrivalIata?: string | null,
  departureIata?: string | null
): PresentedPlan | null {
  const planned = planFromMaster(slug, tripDays, vibe);
  const master = getMaster(slug);
  if (!planned || !master) return null;

  const gapItems: GapItem[] = planned.gaps.map((g) => ({
    kind: g.kind,
    text: g.text,
  }));

  const hubs = new Set(master.hubs.map((h) => h.toUpperCase()));
  if (arrivalIata && !hubs.has(arrivalIata.trim().toUpperCase())) {
    gapItems.push({
      kind: 'transfer',
      text: `Hub arrivo ${arrivalIata.toUpperCase()} fuori dai collegamenti curati: verifica i voli in autonomia.`,
    });
  }
  if (departureIata && !hubs.has(departureIata.trim().toUpperCase())) {
    gapItems.push({
      kind: 'transfer',
      text: `Hub partenza ${departureIata.toUpperCase()} fuori dai collegamenti curati: verifica i voli in autonomia.`,
    });
  }

  return {
    ok: true,
    quality: 'curated',
    destinationSlug: master.slug,
    destinationName: master.nameIt,
    durationDays: planned.template.duration_days,
    templateId: planned.template.template_id,
    summary: planned.template.summary,
    days: planned.template.days.map((d) => ({
      dayNumber: d.day_number,
      title: humanizeDayTitle(d.title),
      description: d.description,
      area: humanizeArea(d.area_segment),
      transferLabel: transferLabelIt(d.transfer ?? 'none'),
      isArrival: d.is_arrival,
      isDeparture: d.is_departure,
      lat: d.lat,
      lng: d.lng,
      activities: d.pois.map((p) => humanizePoiName(p.name)),
    })),
    gaps: groupGaps(gapItems),
    attributions: master.provenance.map((a) => ({
      attribution: a.attribution,
      claimIt: attributionClaimIt(a.claimIt),
      sourceUrl: a.sourceUrl,
      retrievedOn: a.retrievedOn,
    })),
    budgetTotalHint: master.budgetOrientativeEur.total_hint,
    logisticsNotes: master.logisticsNotesIt,
    disclaimer:
      'Itinerario da master curato, rimodulato su giorni e stile. Non è bookability live né fattibilità garantita di voli/traghetti. Ognuno prenota i propri servizi.',
  };
}

function presentSkeleton(
  dest: NonNullable<ReturnType<typeof findCatalogDestination>>,
  tripDays: number
): PresentedPlan {
  const days = buildSkeletonDays(dest, tripDays);
  const gapItems: GapItem[] = [
    {
      kind: 'coverage',
      text: `Per ${dest.name} non c’è ancora un master curato: schema base con lacune da verificare.`,
    },
    {
      kind: 'budget',
      text: 'Budget da stimare con ricerca voli e hotel: qui non indichiamo un totale inventato.',
    },
  ];
  for (const d of days) {
    if (!d.transferTimingVerified && d.transfer && d.transfer !== 'none') {
      gapItems.push({
        kind: 'transfer',
        text: `Giorno ${d.day_number}: ${transferLabelIt(d.transfer) || 'spostamento'} — orari e costi da verificare.`,
      });
    }
  }

  const attributions = skeletonProvenance(dest).map((a: ProvenanceRecord) => ({
    attribution: a.attribution,
    claimIt: attributionClaimIt(a.claim),
    sourceUrl: a.sourceUrl,
    retrievedOn: a.retrievedOn,
  }));

  return {
    ok: true,
    quality: 'skeleton',
    destinationSlug: dest.slug,
    destinationName: dest.name,
    durationDays: days.length,
    templateId: null,
    summary: `Schema orientativo per ${dest.name} su ${days.length} giorni.`,
    days: days.map((d) => ({
      dayNumber: d.day_number,
      title: d.title,
      description: d.description,
      area: d.area_segment,
      transferLabel: transferLabelIt(d.transfer),
      isArrival: d.is_arrival,
      isDeparture: d.is_departure,
      lat: d.lat,
      lng: d.lng,
      activities: d.activities,
    })),
    gaps: groupGaps(gapItems),
    attributions,
    budgetTotalHint: null,
    logisticsNotes: 'Master curato in arrivo. Nessun pacchetto combinato.',
    disclaimer:
      'Schema temporaneo da catalogo. Non copia itinerari protetti e non garantisce bookability.',
  };
}

export function planDestination(input: PlanDestinationInput): PresentedPlan {
  const slug = input.destinationSlug.trim().toLowerCase();
  if (!slug) {
    return { ok: false, reason: 'missing', message: 'Scegli una destinazione.' };
  }
  if (!Number.isFinite(input.tripDays) || input.tripDays < 2) {
    return {
      ok: false,
      reason: 'impossible_duration',
      message: 'Servono almeno 2 giorni (arrivo e partenza).',
    };
  }

  const dest = findCatalogDestination(slug);
  if (!dest) {
    return {
      ok: false,
      reason: 'unknown',
      message: 'Destinazione non presente nel catalogo del sito.',
    };
  }

  if (hasCuratedMaster(slug)) {
    const presented = presentMasterPlan(
      slug,
      input.tripDays,
      asTripVibe(input.vibe),
      input.arrivalIata,
      input.departureIata
    );
    if (presented) return presented;
  }

  return presentSkeleton(dest, input.tripDays);
}

export function plannerCoverageReport(): Array<{
  slug: string;
  name: string;
  active: boolean;
  quality: PlanQuality | 'missing';
  hasCuratedTemplate: boolean;
  sources: string[];
}> {
  return wizardCatalogDestinations().map((d) => {
    const master = getMaster(d.slug);
    const curated = hasCuratedMaster(d.slug) || templatesForDestination(d.slug).length > 0;
    return {
      slug: d.slug,
      name: d.name,
      active: d.active,
      quality: master ? 'curated' : 'skeleton',
      hasCuratedTemplate: curated,
      sources: master ? master.provenance.map((p) => p.attribution) : ['OSM/catalog only'],
    };
  });
}
