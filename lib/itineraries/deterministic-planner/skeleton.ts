/**
 * Deterministic skeleton itinerary from catalog destination only.
 * Uses existing lat/lng + allowed durations. Does not invent attractions or fares.
 */

import type { CatalogDestination } from '@/lib/catalog/destinations';
import type { ItineraryDay, ItineraryTemplate } from '@/lib/itineraries/types';
import type { ProvenanceRecord } from '@/lib/itineraries/thailand-pilot/provenance';

export type PlanQuality = 'curated' | 'skeleton';

export type SkeletonPlanDay = {
  day_number: number;
  title: string;
  description: string;
  area_segment: string;
  transfer: ItineraryDay['transfer'];
  is_arrival: boolean;
  is_departure: boolean;
  lat?: number;
  lng?: number;
  activities: string[];
  transferTimingVerified: boolean;
  activityVerified: boolean[];
};

const OSM_PROVENANCE = (dest: CatalogDestination): ProvenanceRecord => ({
  id: `osm-${dest.slug}`,
  claim: `Coordinate di riferimento per ${dest.name} (catalogo / OpenStreetMap).`,
  sourceUrl: 'https://www.openstreetmap.org/copyright',
  license: 'odbl-osm',
  retrievedOn: '2026-11-08',
  attribution: '© OpenStreetMap contributors (ODbL)',
});

/**
 * Build a usable day-by-day skeleton. Prefer fewer invented specifics:
 * arrival → explore main area → optional buffer → departure.
 * Long trips may add a generic "seconda zona (da confermare)" block without naming fake POIs.
 */
export function buildSkeletonDays(
  dest: CatalogDestination,
  tripDays: number
): SkeletonPlanDay[] {
  const n = Math.max(2, Math.min(60, Math.floor(tripDays)));
  const lat = dest.lat;
  const lng = dest.lng;
  const area = dest.name;
  const days: SkeletonPlanDay[] = [];

  days.push({
    day_number: 1,
    title: `Arrivo a ${dest.name}`,
    description: 'Arrivo, check-in e ritmo soft. Niente programma pieno se il viaggio è lungo.',
    area_segment: area,
    transfer: 'none',
    is_arrival: true,
    is_departure: false,
    lat,
    lng,
    activities: ['Arrivo e sistemazione'],
    transferTimingVerified: true,
    activityVerified: [false],
  });

  const middle = n - 2;
  const useSecondZone = n >= 10;
  const firstBlock = useSecondZone ? Math.ceil(middle * 0.55) : middle;
  const secondBlock = middle - firstBlock;

  for (let i = 0; i < firstBlock; i++) {
    const dayNum = 2 + i;
    const isTransferIntoSecond = useSecondZone && i === firstBlock - 1 && secondBlock > 0;
    if (isTransferIntoSecond) {
      days.push({
        day_number: dayNum,
        title: 'Spostamento verso una seconda zona',
        description:
          'Giorno dedicato allo spostamento. Orari e mezzo da verificare: la geografia non dice quanto ci vuole.',
        area_segment: area,
        transfer: 'bus',
        is_arrival: false,
        is_departure: false,
        lat,
        lng,
        activities: ['Trasferimento (mezzo e orari da confermare)'],
        transferTimingVerified: false,
        activityVerified: [false],
      });
      continue;
    }
    days.push({
      day_number: dayNum,
      title: `Esplorazione a ${dest.name}`,
      description:
        dest.vibe?.trim()
          ? `Tempo nella zona principale. Idee di atmosfera: ${dest.vibe.trim()}. Luoghi precisi da scegliere sul posto.`
          : 'Tempo nella zona principale. Scegliete i luoghi sul posto: qui non inventiamo tappe non verificate.',
      area_segment: area,
      transfer: 'none',
      is_arrival: false,
      is_departure: false,
      lat,
      lng,
      activities: ['Passeggiate e luoghi da scegliere in loco'],
      transferTimingVerified: true,
      activityVerified: [false],
    });
  }

  for (let i = 0; i < secondBlock; i++) {
    const dayNum = 2 + firstBlock + i;
    const isLastMiddle = i === secondBlock - 1 && secondBlock > 1;
    days.push({
      day_number: dayNum,
      title: isLastMiddle ? 'Giorno di margine' : 'Seconda zona (da confermare)',
      description: isLastMiddle
        ? 'Margine prima del rientro: utile se ci sono ritardi o voglia di riposo.'
        : 'Seconda area solo come ipotesi di ritmo. Città e collegamenti specifici vanno confermati con fonti ufficiali o operatori locali.',
      area_segment: area,
      transfer: 'none',
      is_arrival: false,
      is_departure: false,
      lat,
      lng,
      activities: [isLastMiddle ? 'Tempo libero' : 'Esplorazione da definire'],
      transferTimingVerified: true,
      activityVerified: [false],
    });
  }

  days.push({
    day_number: n,
    title: 'Partenza',
    description: 'Volo o rientro. Mattina libera solo se l’orario lo permette.',
    area_segment: area,
    transfer: 'none',
    is_arrival: false,
    is_departure: true,
    lat,
    lng,
    activities: ['Partenza'],
    transferTimingVerified: true,
    activityVerified: [false],
  });

  return days.map((d, i) => ({ ...d, day_number: i + 1 }));
}

export function skeletonAsTemplate(
  dest: CatalogDestination,
  tripDays: number
): ItineraryTemplate {
  const days = buildSkeletonDays(dest, tripDays).map((d) => ({
    day_number: d.day_number,
    title: d.title,
    description: d.description,
    area_segment: d.area_segment,
    pois: d.activities.map((name, i) => ({
      name,
      priority: (d.is_arrival || d.is_departure || i === 0 ? 'core' : 'optional') as
        | 'core'
        | 'optional',
      half_or_full: 'full' as const,
    })),
    transfer: d.transfer,
    is_arrival: d.is_arrival,
    is_departure: d.is_departure,
    lat: d.lat,
    lng: d.lng,
  }));

  return {
    template_id: `${dest.slug}-skeleton-${days.length}d`,
    destination_slug: dest.slug,
    destination_name: dest.name,
    duration_days: days.length,
    title: `${dest.name} · ${days.length} giorni`,
    summary: `Schema orientativo per ${dest.name}. Non è un pacchetto né bookability live.`,
    budget_orientative_eur: {
      flights_hint: 0,
      hotel_hint: 0,
      activities_hint: 0,
      food_hint: 0,
      total_hint: 0,
    },
    days,
    hotels: [{ area_segment: dest.name, name_or_zone: 'Zona centrale / comoda ai trasporti', notes: 'Ognuno prenota la propria camera.' }],
    paid_activities: [],
    logistics_notes:
      'Piano scheletro: trasferimenti e attività precise vanno verificati. Budget da stimare in ricerca voli/hotel.',
    status: 'draft',
  };
}

export function skeletonProvenance(dest: CatalogDestination): ProvenanceRecord[] {
  return [OSM_PROVENANCE(dest)];
}
