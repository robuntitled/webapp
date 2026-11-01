/**
 * Basemap Leaflet stilizzata (Carto CDN pubblico, senza API key).
 * Default: Voyager senza etichette → niente scritte locali (es. thai) né griglia densissima di nomi.
 * I pin/route dell’app restano l’unico testo sulla mappa.
 */

export type LeafletTileVariant = 'stylized' | 'soft' | 'labeled';

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Varianti Carto raster (subdomini a–d). */
const CARTO_TILES: Record<LeafletTileVariant, string> = {
  /** Soft color, strade principali, nessuna label — itinerari / trip. */
  stylized:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
  /** Grigio chiaro minimal, nessuna label. */
  soft: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
  /** Voyager con label (ancora lingua locale OSM; solo se serve contesto). */
  labeled:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
};

export function getLeafletTileLayer(
  variant: LeafletTileVariant = 'stylized'
): { url: string; attribution: string; variant: LeafletTileVariant } {
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  const base = CARTO_TILES[variant] ?? CARTO_TILES.stylized;
  const url = cartoKey
    ? `${base}${base.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(cartoKey)}`
    : base;

  return {
    url,
    attribution: CARTO_ATTRIBUTION,
    variant,
  };
}
