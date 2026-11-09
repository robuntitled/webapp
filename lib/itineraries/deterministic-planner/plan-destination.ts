/**
 * Deterministic planner for every catalog destination.
 * Thailand with curated templates stays preferred; others get an honest skeleton.
 */

import {
  findCatalogDestination,
  wizardCatalogDestinations,
} from '@/lib/catalog/destinations';
import { templatesForDestination } from '@/lib/itineraries/catalog';
import {
  planThailandDeterministic,
  THAILAND_DESTINATION_SLUG,
  type ThailandPlanResult,
} from '@/lib/itineraries/thailand-pilot/plan';
import type { TripVibe } from '@/lib/itineraries/fit';
import type { ProvenanceRecord } from '@/lib/itineraries/thailand-pilot/provenance';
import {
  groupGaps,
  humanizeArea,
  humanizeDayTitle,
  humanizePoiName,
  transferLabelIt,
  warningCodeToGap,
  attributionClaimIt,
  type GapItem,
} from '@/lib/itineraries/deterministic-planner/humanize';
import {
  buildSkeletonDays,
  skeletonProvenance,
  type PlanQuality,
} from '@/lib/itineraries/deterministic-planner/skeleton';

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
      attributions: Array<{ attribution: string; claimIt: string; sourceUrl: string; retrievedOn: string }>;
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

function presentThailand(result: Extract<ThailandPlanResult, { ok: true }>): PresentedPlan {
  const gapItems: GapItem[] = [];
  for (const w of result.warnings) {
    const g = warningCodeToGap(w.code, w.message, w.dayNumber);
    if (g) gapItems.push(g);
  }
  return {
    ok: true,
    quality: 'curated',
    destinationSlug: THAILAND_DESTINATION_SLUG,
    destinationName: 'Thailandia',
    durationDays: result.durationDays,
    templateId: result.templateId,
    summary: result.summary,
    days: result.days.map((d) => ({
      dayNumber: d.day_number,
      title: humanizeDayTitle(d.title),
      description: d.description,
      area: humanizeArea(d.area_segment),
      transferLabel: transferLabelIt(d.transfer),
      isArrival: d.is_arrival,
      isDeparture: d.is_departure,
      lat: d.lat,
      lng: d.lng,
      activities: d.pois.map((p) => humanizePoiName(p.name)),
    })),
    gaps: groupGaps(gapItems),
    attributions: result.attributions.map((a) => ({
      attribution: a.attribution,
      claimIt: attributionClaimIt(a.claim),
      sourceUrl: a.sourceUrl,
      retrievedOn: a.retrievedOn,
    })),
    budgetTotalHint: result.budgetOrientativeEur.total_hint,
    logisticsNotes: result.logisticsNotes,
    disclaimer:
      'Schema da template curato e vincoli (date, ritmo, hub). Non è bookability live né fattibilità di voli/traghetti garantita. Ognuno prenota i propri servizi.',
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
      text: `Per ${dest.name} non c’è ancora un itinerario curato giorno-per-giorno: questo è uno schema orientativo.`,
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
    if (d.activities.some((_, i) => !d.activityVerified[i])) {
      // Don't spam per-activity — one line per day max for skeleton
      if (d.is_arrival || d.is_departure) continue;
      gapItems.push({
        kind: 'activity',
        text: `Giorno ${d.day_number}: luoghi precisi da scegliere in loco (niente elenco inventato).`,
      });
    }
  }

  const attributions = skeletonProvenance(dest).map((a: ProvenanceRecord) => ({
    attribution: a.attribution,
    claimIt: attributionClaimIt(a.claim),
    sourceUrl: a.sourceUrl,
    retrievedOn: a.retrievedOn,
  }));

  const curatedExists = templatesForDestination(dest.slug).length > 0;

  return {
    ok: true,
    quality: curatedExists ? 'curated' : 'skeleton',
    destinationSlug: dest.slug,
    destinationName: dest.name,
    durationDays: days.length,
    templateId: curatedExists
      ? templatesForDestination(dest.slug).sort(
          (a, b) => Math.abs(a.duration_days - tripDays) - Math.abs(b.duration_days - tripDays)
        )[0]?.template_id ?? null
      : null,
    summary: `Schema orientativo per ${dest.name} su ${days.length} giorni. Atmosfera catalogo: ${dest.vibe || 'da scoprire sul posto'}.`,
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
    logisticsNotes:
      'Usa ricerca voli/hotel dopo aver fissato le date. Nessun pacchetto combinato.',
    disclaimer:
      'Piano deterministico da catalogo (coordinate e durata). Non copia itinerari protetti da copyright e non garantisce bookability o fattibilità dei trasferimenti.',
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

  if (slug === THAILAND_DESTINATION_SLUG) {
    const th = planThailandDeterministic({
      destinationSlug: slug,
      tripDays: input.tripDays,
      vibe: asTripVibe(input.vibe),
      travelMonth: input.travelMonth,
      arrivalIata: input.arrivalIata,
      departureIata: input.departureIata,
    });
    if (th.ok) return presentThailand(th);
    return { ok: false, reason: th.reason, message: th.message };
  }

  return presentSkeleton(dest, input.tripDays);
}

/** Destinations offered on the site (wizard catalog). */
export function plannerCoverageReport(): Array<{
  slug: string;
  name: string;
  active: boolean;
  quality: PlanQuality | 'missing';
  hasCuratedTemplate: boolean;
}> {
  return wizardCatalogDestinations().map((d) => {
    const curated = templatesForDestination(d.slug).length > 0;
    return {
      slug: d.slug,
      name: d.name,
      active: d.active,
      quality: curated ? 'curated' : 'skeleton',
      hasCuratedTemplate: curated,
    };
  });
}
