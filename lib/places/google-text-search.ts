import 'server-only';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export type GooglePlaceResult = {
  id: string;
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
  placeTypeLabel: string;
};

type Bounds = { lat: number; lng: number; radiusKm?: number };

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function searchGooglePlacesInBounds(
  query: string,
  bounds: Bounds[],
  maxRadiusKm = 120
): Promise<GooglePlaceResult[]> {
  if (!API_KEY || query.trim().length < 2 || bounds.length === 0) return [];

  const primary = bounds[0];
  const location = `${primary.lat},${primary.lng}`;
  const radiusM = Math.min(maxRadiusKm * 1000, 50000);

  const params = new URLSearchParams({
    query: query.trim(),
    location,
    radius: String(radiusM),
    language: 'it',
    key: API_KEY,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: {
      place_id: string;
      name: string;
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
      types?: string[];
    }[];
    status?: string;
  };

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];

  const allowedCenters = bounds.map((b) => ({ lat: b.lat, lng: b.lng }));

  return (data.results ?? [])
    .map((place) => {
      const lat = place.geometry?.location?.lat;
      const lng = place.geometry?.location?.lng;
      if (lat == null || lng == null) return null;
      const minDist = Math.min(
        ...allowedCenters.map((c) => haversineKm(c, { lat, lng }))
      );
      if (minDist > maxRadiusKm) return null;
      return {
        id: place.place_id,
        label: place.name,
        subtitle: place.formatted_address ?? '',
        lat,
        lng,
        placeTypeLabel: place.types?.[0]?.replace(/_/g, ' ') ?? 'Luogo',
      } satisfies GooglePlaceResult;
    })
    .filter((p): p is GooglePlaceResult => p !== null)
    .slice(0, 12);
}