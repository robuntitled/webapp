'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  Map,
  Marker,
  useMap,
  useMapsLibrary,
  useApiIsLoaded,
  ColorScheme,
} from '@vis.gl/react-google-maps';
import type { MapPin } from '@/lib/maps/pins';
import type { MapViewMode } from '@/lib/maps/map-view-mode';
import type { DestinationMeta } from '@/types/composer';
import { resolveDestinationCoords } from '@/lib/maps/coordinates';
import { GOOGLE_MAP_CIRCLE_PATH, GOOGLE_MAP_DARK_STYLES } from '@/lib/maps/google-map-styles';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const ROUTE_COLOR = '#f97316';
const ROUTE_GLOW = '#fb923c';

/** Stable map id so @vis.gl can reuse the instance across prop updates. */
const COMPOSER_MAP_ID = 'nomadlink-composer-map';

type LatLng = { lat: number; lng: number };

export type MapPoiClickPayload = {
  placeId: string;
  lat: number;
  lng: number;
};

/** Pan imperativo (es. ricerca luoghi) — indipendente dal fit giorno/modalità. */
export type MapCameraTarget = {
  lat: number;
  lng: number;
  zoom?: number;
  /** Cambia a ogni selezione per ri-triggerare il pan anche sullo stesso punto. */
  nonce?: number;
};

type ReactGoogleTripMapProps = {
  destination: string;
  destinationMeta?: DestinationMeta | null;
  pins: MapPin[];
  mapMode: MapViewMode;
  activeDayIndex: number;
  highlightedPinId?: string | null;
  cameraTarget?: MapCameraTarget | null;
  onPinClick?: (pin: MapPin) => void;
  onMapClick?: (lat: number, lng: number) => void;
  /** Click su POI basemap Google (Circo Massimo, musei, …) — non pin itinerario. */
  onPoiClick?: (payload: MapPoiClickPayload) => void;
  className?: string;
  showRoute?: boolean;
};

function isStopPin(pin: MapPin): boolean {
  return pin.id !== 'destination' && Boolean(pin.blockId);
}

/**
 * Camera fit solo al cambio giorno/modalità — NON ad ogni pin aggiunto.
 * Evita zoom in/out quando si aggiunge un luogo dalla mappa (fullscreen o no).
 */
function fitSignature(mapMode: MapViewMode, activeDayIndex: number): string {
  return `${mapMode}|${activeDayIndex}`;
}

/**
 * Moves the camera when the day / view mode changes.
 * Does NOT remount the Map — no extra Dynamic Maps load.
 * Does NOT refit when pins are added/removed (stable viewport while composing).
 */
function MapFitBounds({
  pins,
  mapMode,
  activeDayIndex,
  stopPins,
  fallbackCenter,
}: {
  pins: MapPin[];
  mapMode: MapViewMode;
  activeDayIndex: number;
  stopPins: MapPin[];
  fallbackCenter: LatLng;
}) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const lastSig = useRef<string>('');

  useEffect(() => {
    if (!map || !coreLib) return;

    const sig = fitSignature(mapMode, activeDayIndex);
    if (sig === lastSig.current) return;
    lastSig.current = sig;

    const fitPins = stopPins.length > 0 ? stopPins : pins;
    const maxZoom = mapMode === 'fullTrip' ? 11 : 13;

    if (fitPins.length === 0) {
      map.moveCamera({ center: fallbackCenter, zoom: 11 });
      return;
    }

    if (fitPins.length === 1) {
      map.moveCamera({
        center: { lat: fitPins[0].lat, lng: fitPins[0].lng },
        zoom: maxZoom,
      });
      return;
    }

    const bounds = new coreLib.LatLngBounds();
    fitPins.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));

    const pad = mapMode === 'fullTrip' ? 60 : 50;
    // Cap maxZoom prima di fitBounds → niente bounce zoom-in poi zoom-out
    const prevMaxZoom = map.get('maxZoom') as number | null | undefined;
    map.setOptions({ maxZoom });
    map.fitBounds(bounds, { top: pad, right: pad, bottom: pad, left: pad });
    const listener = coreLib.event.addListenerOnce(map, 'idle', () => {
      map.setOptions({
        maxZoom: prevMaxZoom == null ? undefined : prevMaxZoom,
      });
    });
    return () => coreLib.event.removeListener(listener);
  }, [map, coreLib, pins, stopPins, mapMode, activeDayIndex, fallbackCenter]);

  return null;
}

/**
 * Pan da ricerca luoghi — non interferisce con MapFitBounds (giorno/modalità).
 */
function MapCameraController({
  target,
}: {
  target?: MapCameraTarget | null;
}) {
  const map = useMap();
  const lastNonce = useRef<number | null>(null);

  useEffect(() => {
    if (!map || !target) return;
    const nonce = target.nonce ?? 0;
    if (lastNonce.current === nonce && target.nonce != null) return;
    lastNonce.current = nonce;

    map.moveCamera({
      center: { lat: target.lat, lng: target.lng },
      zoom: target.zoom ?? 14,
    });
  }, [map, target]);

  return null;
}

/**
 * Blocca l'info window nativa Google sui POI e inoltra placeId al parent.
 */
function PoiClickBridge({
  onPoiClick,
}: {
  onPoiClick?: (payload: MapPoiClickPayload) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !onPoiClick) return;

    const listener = map.addListener(
      'click',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => {
        const placeId = e?.placeId as string | undefined;
        if (!placeId) return;
        // Impedisce "View on Google Maps"
        if (typeof e.stop === 'function') e.stop();
        const lat = e.latLng?.lat?.() ?? e.latLng?.lat;
        const lng = e.latLng?.lng?.() ?? e.latLng?.lng;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        onPoiClick({ placeId, lat, lng });
      }
    );

    return () => {
      listener.remove();
    };
  }, [map, onPoiClick]);

  return null;
}

function RoutePolyline({ path }: { path: LatLng[] }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || path.length < 2) return;

    const glow = new mapsLib.Polyline({
      path,
      strokeColor: ROUTE_GLOW,
      strokeOpacity: 0.35,
      strokeWeight: 8,
      geodesic: true,
    });
    const line = new mapsLib.Polyline({
      path,
      strokeColor: ROUTE_COLOR,
      strokeOpacity: 0.95,
      strokeWeight: 3,
      geodesic: true,
    });

    glow.setMap(map);
    line.setMap(map);

    return () => {
      glow.setMap(null);
      line.setMap(null);
    };
  }, [map, mapsLib, path]);

  return null;
}

function TripPins({
  pins,
  stopPins,
  activeDayIndex,
  mapMode,
  highlightedPinId,
  onPinClick,
}: {
  pins: MapPin[];
  stopPins: MapPin[];
  activeDayIndex: number;
  mapMode: MapViewMode;
  highlightedPinId?: string | null;
  onPinClick?: (pin: MapPin) => void;
}) {
  const apiReady = useApiIsLoaded();
  if (!apiReady) return null;

  return (
    <>
      {pins.map((pin) => {
        const stopIndex = stopPins.findIndex((p) => p.id === pin.id);
        const highlighted =
          highlightedPinId === pin.id || highlightedPinId === pin.blockId;
        const color =
          pin.dayIndex === activeDayIndex || mapMode === 'fullTrip'
            ? '#f97316'
            : '#a855f7';
        const label = pin.emoji || (isStopPin(pin) ? String(stopIndex + 1) : '');

        return (
          <Marker
            key={pin.id}
            position={{ lat: pin.lat, lng: pin.lng }}
            onClick={() => onPinClick?.(pin)}
            label={{
              text: label,
              color: '#ffffff',
              fontSize: highlighted ? '14px' : '12px',
              fontWeight: '700',
            }}
            icon={{
              path: GOOGLE_MAP_CIRCLE_PATH,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: highlighted ? '#ffffff' : 'rgba(255,255,255,0.85)',
              strokeWeight: highlighted ? 3 : 2,
              scale: highlighted ? 14 : 11,
            }}
            zIndex={highlighted ? 100 : 10}
          />
        );
      })}
    </>
  );
}

function TripMapInner({
  destination,
  destinationMeta,
  pins,
  mapMode,
  activeDayIndex,
  highlightedPinId,
  cameraTarget,
  onPinClick,
  onMapClick,
  onPoiClick,
  className = '',
  showRoute = false,
}: ReactGoogleTripMapProps) {
  const center = useMemo(
    () =>
      resolveDestinationCoords(destination, destinationMeta) ?? {
        lat: 41.9,
        lng: 12.5,
      },
    [destination, destinationMeta]
  );
  const stopPins = useMemo(() => pins.filter(isStopPin), [pins]);
  const routePath = useMemo(
    () => stopPins.map((p) => ({ lat: p.lat, lng: p.lng })),
    [stopPins]
  );

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <Map
        id={COMPOSER_MAP_ID}
        reuseMaps
        defaultCenter={center}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={Boolean(onPoiClick)}
        colorScheme={ColorScheme.DARK}
        styles={GOOGLE_MAP_DARK_STYLES}
        backgroundColor="#0f172a"
        onClick={(e) => {
          // POI gestiti da PoiClickBridge (listener nativo + e.stop())
          if (!onMapClick) return;
          const placeId = (e.detail as { placeId?: string | null }).placeId;
          if (placeId) return;
          const latLng = e.detail.latLng;
          if (latLng) onMapClick(latLng.lat, latLng.lng);
        }}
        style={{ width: '100%', height: '100%' }}
      >
        {onPoiClick && <PoiClickBridge onPoiClick={onPoiClick} />}
        <MapFitBounds
          pins={pins}
          stopPins={stopPins}
          mapMode={mapMode}
          activeDayIndex={activeDayIndex}
          fallbackCenter={center}
        />
        <MapCameraController target={cameraTarget} />
        {showRoute && routePath.length >= 2 && <RoutePolyline path={routePath} />}
        <TripPins
          pins={pins}
          stopPins={stopPins}
          activeDayIndex={activeDayIndex}
          mapMode={mapMode}
          highlightedPinId={highlightedPinId}
          onPinClick={onPinClick}
        />
      </Map>
    </div>
  );
}

function MapLoadError() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0f172a] p-6 text-center text-sm text-white/60">
      <p>Impossibile caricare Google Maps</p>
      <p className="text-xs text-white/40">
        Verifica la API key, le restrizioni referrer su Vercel e che Maps JavaScript API sia
        abilitata.
      </p>
    </div>
  );
}

export function ReactGoogleTripMap(props: ReactGoogleTripMapProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0f172a] p-6 text-center text-sm text-white/60">
        <p>Mappa non configurata</p>
        <p className="text-xs text-white/40">
          Aggiungi NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local e su Vercel.
        </p>
      </div>
    );
  }

  if (loadFailed) return <MapLoadError />;

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      onError={() => setLoadFailed(true)}
    >
      <TripMapInner {...props} />
    </APIProvider>
  );
}
