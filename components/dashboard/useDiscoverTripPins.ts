'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TripWithRelations } from '@/types/trip';
import type { PlaceResult } from '@/lib/places/types';
import { coordsFromDestinationLabel } from '@/lib/trips/destination-coords';
import type { HotelMapPin } from '@/components/travel/HotelsResultsMap';

const cache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeLabel(label: string): Promise<{ lat: number; lng: number } | null> {
  const key = label.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  const known = coordsFromDestinationLabel(label);
  if (known) {
    cache.set(key, known);
    return known;
  }

  try {
    const res = await fetch(`/api/places/search?q=${encodeURIComponent(label)}`);
    const data = (await res.json()) as { results?: PlaceResult[] };
    const hit = data.results?.[0];
    const coords = hit ? { lat: hit.lat, lng: hit.lng } : null;
    cache.set(key, coords);
    return coords;
  } catch {
    cache.set(key, null);
    return null;
  }
}

export function useDiscoverTripPins(trips: TripWithRelations[]): HotelMapPin[] {
  const catalogPins = useMemo(() => {
    return trips.flatMap((trip) => {
      const coords = coordsFromDestinationLabel(trip.destination);
      if (!coords) return [];
      return [
        {
          id: trip.id,
          name: trip.title,
          lat: coords.lat,
          lng: coords.lng,
          price: Number(trip.price) || undefined,
          currency: 'EUR',
          imageUrl: trip.imageUrl,
          subtitle: trip.destination,
          ctaLabel: 'Apri viaggio',
        } satisfies HotelMapPin,
      ];
    });
  }, [trips]);

  const [extra, setExtra] = useState<HotelMapPin[]>([]);

  const missing = useMemo(
    () => trips.filter((t) => !coordsFromDestinationLabel(t.destination)),
    [trips]
  );

  useEffect(() => {
    if (missing.length === 0) {
      setExtra([]);
      return;
    }
    let cancelled = false;
    const unique = [...new Set(missing.map((t) => t.destination.trim()))];

    void (async () => {
      const coordsByLabel = new Map<string, { lat: number; lng: number } | null>();
      for (const label of unique.slice(0, 12)) {
        coordsByLabel.set(label, await geocodeLabel(label));
      }
      if (cancelled) return;
      const pins: HotelMapPin[] = [];
      for (const trip of missing) {
        const coords = coordsByLabel.get(trip.destination.trim());
        if (!coords) continue;
        pins.push({
          id: trip.id,
          name: trip.title,
          lat: coords.lat,
          lng: coords.lng,
          price: Number(trip.price) || undefined,
          currency: 'EUR',
          imageUrl: trip.imageUrl,
          subtitle: trip.destination,
          ctaLabel: 'Apri viaggio',
        });
      }
      setExtra(pins);
    })();

    return () => {
      cancelled = true;
    };
  }, [missing]);

  return useMemo(() => [...catalogPins, ...extra], [catalogPins, extra]);
}
