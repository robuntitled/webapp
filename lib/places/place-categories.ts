/**
 * Categorie "Aggiungi" allineate ai tipi Google Places API (New) Table A.
 * I bottoni filtrano Nearby/Text Search — non sono solo etichette.
 */
import type { ComposerBlockType } from '@/types/composer';

export type PlaceCategoryId =
  | 'attraction'
  | 'meal'
  | 'activity'
  | 'shopping'
  | 'hotel';

export type PlaceCategory = {
  id: PlaceCategoryId;
  label: string;
  /** Placeholder search box */
  searchPlaceholder: string;
  /** Blocco composer al salvataggio */
  blockType: ComposerBlockType;
  /**
   * Tipi Google Places (Table A) per Nearby Search — OR.
   * Max ~10 per tenere la chiamata leggera.
   */
  googleTypes: string[];
  /**
   * Tipo primario per Text Search (New accetta un solo includedType).
   */
  textIncludedType: string;
  /** Boost opzionale se includedType non basta */
  textBoost?: string;
};

/** Ordine UI: visita → cibo → fare → comprare → dormire */
export const PLACE_CATEGORIES: PlaceCategory[] = [
  {
    id: 'attraction',
    label: 'Attrazioni',
    searchPlaceholder: 'Musei, monumenti, parchi…',
    blockType: 'attraction',
    googleTypes: [
      'tourist_attraction',
      'museum',
      'art_gallery',
      'park',
      'church',
      'zoo',
      'aquarium',
      'hindu_temple',
      'mosque',
      'synagogue',
    ],
    textIncludedType: 'tourist_attraction',
    textBoost: 'attrazione',
  },
  {
    id: 'meal',
    label: 'Cibo',
    searchPlaceholder: 'Ristoranti, caffè, pizzerie…',
    blockType: 'meal',
    googleTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway'],
    textIncludedType: 'restaurant',
    textBoost: 'ristorante',
  },
  {
    id: 'activity',
    label: 'Attività',
    searchPlaceholder: 'Spa, sport, divertimenti…',
    blockType: 'activity',
    googleTypes: [
      'spa',
      'gym',
      'amusement_park',
      'stadium',
      'night_club',
      'movie_theater',
      'bowling_alley',
      'marina',
      'casino',
    ],
    textIncludedType: 'spa',
    textBoost: 'attività',
  },
  {
    id: 'shopping',
    label: 'Shopping',
    searchPlaceholder: 'Centri commerciali, mercati…',
    blockType: 'activity',
    googleTypes: [
      'shopping_mall',
      'department_store',
      'clothing_store',
      'book_store',
      'shoe_store',
      'jewelry_store',
      'supermarket',
    ],
    textIncludedType: 'shopping_mall',
    textBoost: 'shopping',
  },
  {
    id: 'hotel',
    label: 'Hotel',
    searchPlaceholder: 'Hotel, B&B, alloggi…',
    blockType: 'hotel',
    googleTypes: ['lodging'],
    textIncludedType: 'lodging',
    textBoost: 'hotel',
  },
];

export const PLACE_CATEGORY_BY_ID: Record<PlaceCategoryId, PlaceCategory> =
  Object.fromEntries(PLACE_CATEGORIES.map((c) => [c.id, c])) as Record<
    PlaceCategoryId,
    PlaceCategory
  >;

export function isPlaceCategoryId(value: string | null | undefined): value is PlaceCategoryId {
  return (
    value === 'attraction' ||
    value === 'meal' ||
    value === 'activity' ||
    value === 'shopping' ||
    value === 'hotel'
  );
}

export function getPlaceCategory(id: PlaceCategoryId): PlaceCategory {
  return PLACE_CATEGORY_BY_ID[id];
}

/** Label IT leggibile da primaryType / types Google */
export const GOOGLE_TYPE_LABELS_IT: Record<string, string> = {
  tourist_attraction: 'Attrazione',
  museum: 'Museo',
  art_gallery: 'Galleria',
  park: 'Parco',
  church: 'Chiesa',
  hindu_temple: 'Tempio',
  mosque: 'Moschea',
  synagogue: 'Sinagoga',
  zoo: 'Zoo',
  aquarium: 'Acquario',
  restaurant: 'Ristorante',
  cafe: 'Caffè',
  bar: 'Bar',
  bakery: 'Panetteria',
  meal_takeaway: 'Asporto',
  spa: 'Spa',
  gym: 'Palestra',
  amusement_park: 'Divertimenti',
  stadium: 'Stadio',
  night_club: 'Nightlife',
  movie_theater: 'Cinema',
  bowling_alley: 'Bowling',
  marina: 'Marina',
  casino: 'Casinò',
  shopping_mall: 'Centro commerciale',
  department_store: 'Grande magazzino',
  clothing_store: 'Abbigliamento',
  book_store: 'Libreria',
  shoe_store: 'Calzature',
  jewelry_store: 'Gioielleria',
  market: 'Mercato',
  lodging: 'Hotel',
  hotel: 'Hotel',
  point_of_interest: 'Luogo',
  establishment: 'Luogo',
};

export function labelForGoogleType(type: string | undefined | null): string {
  if (!type) return 'Luogo';
  return GOOGLE_TYPE_LABELS_IT[type] ?? type.replace(/_/g, ' ');
}
