/**
 * Basemap Leaflet stilizzata.
 * - Con `NEXT_PUBLIC_CARTO_API_KEY`: Carto Voyager senza label (soft, travel).
 * - Senza chiave: Esri World Light Gray (pubblico) — niente watermark Carto e
 *   niente griglia densissima di scritte locali (es. thai). Zoom/pin restano in-app.
 */

export type LeafletTileVariant = 'stylized' | 'soft' | 'labeled';

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';

/** Carto raster (serve API key; senza chiave Carto mette watermark). */
const CARTO_TILES: Record<LeafletTileVariant, string> = {
  stylized:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
  soft: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
  labeled:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
};

/**
 * Esri Canvas — ordine tile `{z}/{y}/{x}` (non x/y).
 * Light Gray = basemap minimal; Reference = poche label latine maggiori.
 */
const ESRI_TILES: Record<LeafletTileVariant, string> = {
  stylized:
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  soft: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  labeled:
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
};

export type LeafletTileLayerConfig = {
  url: string;
  attribution: string;
  variant: LeafletTileVariant;
  /** Subdomini Leaflet (`abcd` per Carto). Assente per Esri. */
  subdomains?: string;
  maxZoom: number;
};

export function getLeafletTileLayer(
  variant: LeafletTileVariant = 'stylized'
): LeafletTileLayerConfig {
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  const resolved = CARTO_TILES[variant] ? variant : 'stylized';

  if (cartoKey) {
    const base = CARTO_TILES[resolved];
    const sep = base.includes('?') ? '&' : '?';
    return {
      url: `${base}${sep}api_key=${encodeURIComponent(cartoKey)}`,
      attribution: CARTO_ATTRIBUTION,
      variant: resolved,
      subdomains: 'abcd',
      maxZoom: 19,
    };
  }

  return {
    url: ESRI_TILES[resolved],
    attribution: ESRI_ATTRIBUTION,
    variant: resolved,
    maxZoom: 16,
  };
}
