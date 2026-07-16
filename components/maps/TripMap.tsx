'use client';

import dynamic from 'next/dynamic';
import type { MapPin } from '@/lib/maps/pins';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
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
  mapMode?: MapViewMode;
};

const ReactGoogleTripMap = dynamic(
  () => import('@/components/maps/ReactGoogleTripMap').then((m) => m.ReactGoogleTripMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[240px] w-full items-center justify-center bg-[#0f172a] text-xs text-white/40">
        Caricamento mappa…
      </div>
    ),
  }
);

/** Google Maps wrapper — UI aligned with the former Mapbox composer map. */
export function TripMap({
  destination,
  destinationMeta,
  pins,
  activeDayIndex,
  highlightedPinId,
  onPinClick,
  onMapClick,
  className = '',
  interactive = true,
  mapMode = 'day',
}: TripMapProps) {
  return (
    <ReactGoogleTripMap
      destination={destination}
      destinationMeta={destinationMeta}
      pins={pins}
      mapMode={mapMode}
      activeDayIndex={activeDayIndex ?? 1}
      highlightedPinId={highlightedPinId}
      onPinClick={onPinClick}
      onMapClick={interactive ? onMapClick : undefined}
      className={className}
    />
  );
}