export const INTEREST_CATEGORIES = ['trip_type', 'setting', 'experience'] as const;

export type InterestCategory = (typeof INTEREST_CATEGORIES)[number];

export type TravelIntent = 'create' | 'book';

export type InterestKeyword = {
  id: string;
  category: InterestCategory;
  label: string;
  emoji: string;
  sortOrder: number;
};

/** Tassonomia onboarding — fonte per UI e seed DB. */
export const INTEREST_KEYWORDS: InterestKeyword[] = [
  // Tipologia di viaggio
  { id: 'city_break', category: 'trip_type', label: 'City break', emoji: '🏙️', sortOrder: 1 },
  { id: 'road_trip', category: 'trip_type', label: 'Road trip', emoji: '🚗', sortOrder: 2 },
  { id: 'backpacking', category: 'trip_type', label: 'Zaino in spalla', emoji: '🎒', sortOrder: 3 },
  { id: 'slow_travel', category: 'trip_type', label: 'Slow travel', emoji: '🐢', sortOrder: 4 },
  { id: 'adventure', category: 'trip_type', label: 'Avventura', emoji: '🏔️', sortOrder: 5 },
  { id: 'wellness_trip', category: 'trip_type', label: 'Relax & wellness', emoji: '🧘', sortOrder: 6 },
  { id: 'cultural_tour', category: 'trip_type', label: 'Viaggio culturale', emoji: '🏛️', sortOrder: 7 },
  { id: 'food_trip', category: 'trip_type', label: 'Food trip', emoji: '🍷', sortOrder: 8 },
  { id: 'luxury', category: 'trip_type', label: 'Lusso', emoji: '✨', sortOrder: 9 },
  { id: 'family_trip', category: 'trip_type', label: 'In famiglia', emoji: '👨‍👩‍👧', sortOrder: 10 },
  { id: 'digital_nomad', category: 'trip_type', label: 'Digital nomad', emoji: '💻', sortOrder: 11 },
  { id: 'festival', category: 'trip_type', label: 'Festival / eventi', emoji: '🎉', sortOrder: 12 },
  // Ambiente
  { id: 'city', category: 'setting', label: 'Città', emoji: '🌆', sortOrder: 1 },
  { id: 'nature', category: 'setting', label: 'Natura', emoji: '🌿', sortOrder: 2 },
  { id: 'beach', category: 'setting', label: 'Mare', emoji: '🏖️', sortOrder: 3 },
  { id: 'mountains', category: 'setting', label: 'Montagna', emoji: '⛰️', sortOrder: 4 },
  { id: 'countryside', category: 'setting', label: 'Campagna', emoji: '🌾', sortOrder: 5 },
  { id: 'islands', category: 'setting', label: 'Isole', emoji: '🏝️', sortOrder: 6 },
  { id: 'desert', category: 'setting', label: 'Deserto / savana', emoji: '🏜️', sortOrder: 7 },
  // Esperienza
  { id: 'culture', category: 'experience', label: 'Musei e storia', emoji: '📜', sortOrder: 1 },
  { id: 'food_wine', category: 'experience', label: 'Cibo e vino', emoji: '🍽️', sortOrder: 2 },
  { id: 'nightlife', category: 'experience', label: 'Vita notturna', emoji: '🌙', sortOrder: 3 },
  { id: 'outdoor', category: 'experience', label: 'Sport e outdoor', emoji: '🥾', sortOrder: 4 },
  { id: 'wellness', category: 'experience', label: 'Spa e benessere', emoji: '💆', sortOrder: 5 },
  { id: 'photography', category: 'experience', label: 'Fotografia', emoji: '📸', sortOrder: 6 },
  { id: 'local_life', category: 'experience', label: 'Vita locale', emoji: '🏘️', sortOrder: 7 },
  { id: 'shopping', category: 'experience', label: 'Shopping', emoji: '🛍️', sortOrder: 8 },
  { id: 'wildlife', category: 'experience', label: 'Wildlife / safari', emoji: '🦁', sortOrder: 9 },
];

export const KEYWORD_BY_ID = new Map(INTEREST_KEYWORDS.map((k) => [k.id, k]));

export function keywordsForCategory(category: InterestCategory): InterestKeyword[] {
  return INTEREST_KEYWORDS.filter((k) => k.category === category);
}

export function isValidKeywordId(id: string): boolean {
  return KEYWORD_BY_ID.has(id);
}
