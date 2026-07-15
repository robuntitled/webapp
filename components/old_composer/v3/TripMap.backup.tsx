'use client';

import dynamic from 'next/dynamic';
import type { MapPin } from '@/lib/maps/pins';
import type { DestinationMeta } from '@/types/composer';

type TripMapProps = {
  destination: string;
  destinationMeta?: DestinationMeta | null;
  pins: MapPin[];
  activeDayIndex?: number;
  highlightedPinId?: string | null;
  onPinClick?: (pin: MapPin) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  interactive?: boolean;
  showRoute?: boolean;
  animateFit?: boolean;
};

const ReactLeafletTripMap = dynamic(
  () =>
    import('@/components/maps/ReactLeafletTripMap').then((m) => m.ReactLeafletTripMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
        Caricamento mappa…
      </div>
    ),
  }
);

/** Thin wrapper — React-Leaflet + Carto Voyager. Legacy Leaflet impl in old_composer/v2. */
export function TripMap({
  destination,
  destinationMeta,
  pins,
  highlightedPinId,
  onPinClick,
  onMapClick,
  className = '',
  interactive = true,
  showRoute = true,
}: TripMapProps) {
  return (
    <ReactLeafletTripMap
      destination={destination}
      destinationMeta={destinationMeta}
      pins={pins}
      showRoute={showRoute}
      highlightedPinId={highlightedPinId}
      onPinClick={onPinClick}
      onMapClick={interactive ? onMapClick : undefined}
      className={className}
    />
  );
}
