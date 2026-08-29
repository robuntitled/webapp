'use client';

import dynamic from 'next/dynamic';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import { buildPinsFromItineraryTemplate } from '@/lib/itineraries/geo';
import type { ItineraryTemplate } from '@/lib/itineraries/types';

const ReactLeafletTripMap = dynamic(
  () => import('@/components/maps/ReactLeafletTripMap').then((m) => m.ReactLeafletTripMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-slate-100" /> }
);

/** Inset paese/destinazione in angolo mappa principale. */
export function ItineraryMapInset({ template }: { template: ItineraryTemplate }) {
  const dest = findCatalogDestination(template.destination_slug);
  const pins = buildPinsFromItineraryTemplate(template);

  if (dest?.lat == null || dest?.lng == null) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-3 left-3 z-[500] h-[4.5rem] w-[5.5rem] overflow-hidden rounded-lg border-2 border-white bg-white shadow-md"
      aria-hidden
    >
      <ReactLeafletTripMap
        destination={template.destination_name}
        destinationMeta={{ label: dest.name, lat: dest.lat, lng: dest.lng }}
        pins={pins.slice(0, 3)}
        showRoute={false}
        interactive={false}
        className="h-full w-full"
      />
    </div>
  );
}
