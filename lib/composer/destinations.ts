import type { ComposerDestination } from '@/types/composer';
import type { PlaceResult } from '@/lib/places/types';
import type { DestinationMeta } from '@/types/composer';
import {
  CONTINENT_COUNTRIES,
  DESTINATION_REGIONS,
  findContinentCountry,
} from '@/lib/composer/continent-countries';

export { DESTINATION_REGIONS, CONTINENT_COUNTRIES };

/** Mete in evidenza (template + griglia Tutte). I paesi per continente stanno in CONTINENT_COUNTRIES. */
export const COMPOSER_DESTINATIONS: ComposerDestination[] = [
  { id: 'thailandia', label: 'Thailandia', emoji: '🇹🇭', region: 'Asia', vibe: 'Spiagge + street food', gradient: 'from-teal-600/80 via-emerald-500/60 to-amber-400/50', lat: 13.7563, lng: 100.5018 },
  { id: 'bali', label: 'Bali', emoji: '🇮🇩', region: 'Asia', vibe: 'Risaie e templi', gradient: 'from-emerald-700/80 via-lime-500/50 to-amber-300/40', lat: -8.4095, lng: 115.1889 },
  { id: 'giappone', label: 'Giappone', emoji: '🇯🇵', region: 'Asia', vibe: 'Cultura e sushi', gradient: 'from-rose-600/70 via-fuchsia-500/50 to-indigo-600/60', lat: 35.6762, lng: 139.6503 },
  { id: 'grecia', label: 'Grecia', emoji: '🇬🇷', region: 'Europa', vibe: 'Isole e tramonti', gradient: 'from-sky-500/70 via-blue-400/50 to-white/30', lat: 37.9838, lng: 23.7275 },
  { id: 'spagna', label: 'Spagna', emoji: '🇪🇸', region: 'Europa', vibe: 'Tapas e movida', gradient: 'from-orange-500/80 via-red-500/50 to-yellow-400/40', lat: 40.4168, lng: -3.7038 },
  { id: 'portogallo', label: 'Portogallo', emoji: '🇵🇹', region: 'Europa', vibe: 'Lisbona e surf', gradient: 'from-blue-600/70 via-teal-500/50 to-amber-300/40', lat: 38.7223, lng: -9.1393 },
  { id: 'croazia', label: 'Croazia', emoji: '🇭🇷', region: 'Europa', vibe: 'Costa adriatica', gradient: 'from-cyan-600/70 via-sky-400/50 to-indigo-500/40', lat: 45.815, lng: 15.9819 },
  { id: 'islanda', label: 'Islanda', emoji: '🇮🇸', region: 'Europa', vibe: 'Aurora e natura', gradient: 'from-indigo-800/80 via-violet-600/50 to-cyan-400/40', lat: 64.1466, lng: -21.9426 },
  { id: 'marocco', label: 'Marocco', emoji: '🇲🇦', region: 'Africa', vibe: 'Medina e deserto', gradient: 'from-amber-600/80 via-orange-500/50 to-rose-400/40', lat: 31.6295, lng: -7.9811 },
  { id: 'dubai', label: 'Dubai', emoji: '🇦🇪', region: 'Medio Oriente', vibe: 'Skyline e lusso', gradient: 'from-amber-500/70 via-yellow-400/40 to-sky-500/60', lat: 25.2048, lng: 55.2708 },
  { id: 'new-york', label: 'New York', emoji: '🇺🇸', region: 'Americhe', vibe: 'City che non dorme', gradient: 'from-slate-700/80 via-indigo-600/50 to-amber-400/40', lat: 40.7128, lng: -74.006 },
  { id: 'messico', label: 'Messico', emoji: '🇲🇽', region: 'Americhe', vibe: 'Cenote e tacos', gradient: 'from-emerald-600/70 via-lime-500/40 to-orange-500/50', lat: 19.4326, lng: -99.1332 },
  { id: 'maldive', label: 'Maldive', emoji: '🇲🇻', region: 'Asia', vibe: 'Paradiso tropicale', gradient: 'from-cyan-400/80 via-teal-300/50 to-sky-200/40', lat: 4.1755, lng: 73.5093 },
  { id: 'sicilia', label: 'Sicilia', emoji: '🇮🇹', region: 'Europa', vibe: 'Mare e granita', gradient: 'from-orange-500/70 via-amber-400/40 to-sky-500/50', lat: 37.5079, lng: 14.0934 },
  { id: 'sardegna', label: 'Sardegna', emoji: '🇮🇹', region: 'Europa', vibe: 'Calette segrete', gradient: 'from-teal-500/70 via-cyan-400/40 to-emerald-300/50', lat: 40.1209, lng: 9.0129 },
  { id: 'canarie', label: 'Canarie', emoji: '🇪🇸', region: 'Europa', vibe: "Sole tutto l'anno", gradient: 'from-yellow-500/70 via-orange-400/40 to-blue-500/50', lat: 28.2916, lng: -16.6291 },
  { id: 'vietnam', label: 'Vietnam', emoji: '🇻🇳', region: 'Asia', vibe: 'Baia e pho', gradient: 'from-green-600/70 via-emerald-400/40 to-teal-500/50', lat: 10.8231, lng: 106.6297 },
  { id: 'australia', label: 'Australia', emoji: '🇦🇺', region: 'Oceania', vibe: 'Surf e koala', gradient: 'from-sky-600/70 via-blue-400/40 to-amber-300/50', lat: -33.8688, lng: 151.2093 },
  { id: 'parigi', label: 'Parigi', emoji: '🇫🇷', region: 'Europa', vibe: 'Arte e boulevard', gradient: 'from-indigo-600/70 via-rose-400/40 to-amber-300/50', lat: 48.8566, lng: 2.3522 },
  { id: 'londra', label: 'Londra', emoji: '🇬🇧', region: 'Europa', vibe: 'Musei e pub', gradient: 'from-slate-600/80 via-indigo-500/40 to-red-400/30', lat: 51.5074, lng: -0.1278 },
  { id: 'amsterdam', label: 'Amsterdam', emoji: '🇳🇱', region: 'Europa', vibe: 'Canali e bici', gradient: 'from-orange-500/60 via-amber-400/40 to-teal-500/50', lat: 52.3676, lng: 4.9041 },
  { id: 'kenya', label: 'Kenya', emoji: '🇰🇪', region: 'Africa', vibe: 'Safari e savana', gradient: 'from-amber-700/70 via-orange-500/40 to-emerald-600/50', lat: -1.2921, lng: 36.8219 },
  { id: 'peru', label: 'Perù', emoji: '🇵🇪', region: 'Americhe', vibe: 'Machu Picchu', gradient: 'from-emerald-700/70 via-lime-500/40 to-amber-500/50', lat: -13.1631, lng: -72.545 },
  { id: 'corea', label: 'Corea del Sud', emoji: '🇰🇷', region: 'Asia', vibe: 'K-culture e street food', gradient: 'from-violet-600/70 via-fuchsia-400/40 to-sky-400/50', lat: 37.5665, lng: 126.978 },
];

export function filterDestinations(query: string): ComposerDestination[] {
  const q = query.trim().toLowerCase();
  const pool = [...COMPOSER_DESTINATIONS, ...CONTINENT_COUNTRIES];
  if (!q) return COMPOSER_DESTINATIONS;
  return pool.filter(
    (d) =>
      d.label.toLowerCase().includes(q) ||
      d.region.toLowerCase().includes(q) ||
      d.vibe.toLowerCase().includes(q)
  );
}

export function findDestination(idOrLabel: string): ComposerDestination | undefined {
  const key = idOrLabel.trim().toLowerCase();
  return (
    COMPOSER_DESTINATIONS.find((d) => d.id === key || d.label.toLowerCase() === key) ??
    findContinentCountry(idOrLabel)
  );
}

export function featuredToMeta(dest: ComposerDestination): DestinationMeta {
  const countryHit = findContinentCountry(dest.label);
  const country =
    dest.region === dest.label
      ? dest.label
      : countryHit?.label ?? dest.label;
  return {
    label: dest.label,
    lat: dest.lat,
    lng: dest.lng,
    subtitle: dest.region,
    placeTypeLabel: dest.region,
    placeType: countryHit ? 'country' : undefined,
    country,
    countryCode: dest.countryCode ?? countryHit?.countryCode,
  };
}

export function placeToMeta(place: PlaceResult): DestinationMeta {
  return {
    label: place.label,
    lat: place.lat,
    lng: place.lng,
    country: place.country,
    countryCode: place.countryCode,
    placeType: place.placeType,
    placeTypeLabel: place.placeTypeLabel,
    subtitle: place.subtitle,
    osmId: place.id,
  };
}

export function destinationDisplayLabel(meta?: DestinationMeta, fallback = ''): string {
  if (!meta) return fallback;
  if (meta.subtitle && !meta.label.includes(meta.subtitle)) {
    return `${meta.label}, ${meta.subtitle}`;
  }
  return meta.label;
}
