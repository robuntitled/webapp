export type LatLng = { lat: number; lng: number };

/** Coordinate centro destinazioni (approssimative per mappa interattiva). */
export const DESTINATION_COORDS: Record<string, LatLng> = {
  thailandia: { lat: 13.7563, lng: 100.5018 },
  bali: { lat: -8.4095, lng: 115.1889 },
  giappone: { lat: 35.6762, lng: 139.6503 },
  grecia: { lat: 37.9838, lng: 23.7275 },
  spagna: { lat: 40.4168, lng: -3.7038 },
  portogallo: { lat: 38.7223, lng: -9.1393 },
  croazia: { lat: 45.815, lng: 15.9819 },
  islanda: { lat: 64.1466, lng: -21.9426 },
  marocco: { lat: 31.6295, lng: -7.9811 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  'new york': { lat: 40.7128, lng: -74.006 },
  'new-york': { lat: 40.7128, lng: -74.006 },
  messico: { lat: 19.4326, lng: -99.1332 },
  maldive: { lat: 4.1755, lng: 73.5093 },
  sicilia: { lat: 37.5079, lng: 14.0934 },
  sardegna: { lat: 40.1209, lng: 9.0129 },
  canarie: { lat: 28.2916, lng: -16.6291 },
  vietnam: { lat: 10.8231, lng: 106.6297 },
  australia: { lat: -33.8688, lng: 151.2093 },
};

export function resolveDestinationCoords(
  destination: string,
  meta?: { lat?: number; lng?: number } | null
): LatLng | null {
  if (meta?.lat != null && meta?.lng != null) {
    return { lat: meta.lat, lng: meta.lng };
  }

  const key = destination.trim().toLowerCase();
  if (DESTINATION_COORDS[key]) return DESTINATION_COORDS[key];

  for (const [name, coords] of Object.entries(DESTINATION_COORDS)) {
    if (key.includes(name) || name.includes(key)) return coords;
  }

  return null;
}

/** Dispone pin in cerchio attorno al centro quando mancano coordinate precise. */
export function offsetAroundCenter(center: LatLng, index: number, total: number): LatLng {
  if (total <= 1) return center;
  const angle = (index / total) * Math.PI * 2;
  const radius = 0.04 + (index % 3) * 0.015;
  return {
    lat: center.lat + Math.sin(angle) * radius,
    lng: center.lng + Math.cos(angle) * radius,
  };
}