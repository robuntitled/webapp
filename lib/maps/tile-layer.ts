/**
 * Basemap Leaflet. Carto CDN richiede API key; senza chiave usiamo OpenStreetMap.
 */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function getLeafletTileLayer(): { url: string; attribution: string } {
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  if (cartoKey) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(cartoKey)}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    };
  }
  return {
    url: OSM_TILE_URL,
    attribution: OSM_TILE_ATTRIBUTION,
  };
}
