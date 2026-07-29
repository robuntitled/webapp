/** Distanza haversine in km */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Tiene solo punti entro maxKm dal centro destinazione.
 * Evita day-trip lontani (es. Tivoli / Civita su catalogo “Roma”).
 */
export function filterHitsNearDestination<
  T extends { lat?: number | null; lng?: number | null },
>(
  hits: T[],
  center: { lat: number | null; lng: number | null },
  maxKm = 15
): T[] {
  if (center.lat == null || center.lng == null) return hits;
  return hits.filter((h) => {
    if (typeof h.lat !== 'number' || typeof h.lng !== 'number') return true;
    return haversineKm(center.lat!, center.lng!, h.lat, h.lng) <= maxKm;
  });
}
