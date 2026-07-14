import type {
  PlannerAccommodation,
  PlannerBudget,
  PlannerExperience,
  PlannerPace,
  PlannerTravelStyle,
} from '@/types/planner';

export const TRAVEL_STYLE_OPTIONS: { id: PlannerTravelStyle; label: string; emoji: string }[] = [
  { id: 'adventure', label: 'Avventura', emoji: '🏔️' },
  { id: 'relax', label: 'Relax', emoji: '🌴' },
  { id: 'culture', label: 'Cultura', emoji: '🏛️' },
  { id: 'food', label: 'Food & wine', emoji: '🍷' },
  { id: 'mix', label: 'Mix di tutto', emoji: '✨' },
];

export const PACE_OPTIONS: { id: PlannerPace; label: string; hint: string }[] = [
  { id: 'slow', label: 'Lento', hint: 'Pochi spostamenti, più tempo per tappa' },
  { id: 'balanced', label: 'Equilibrato', hint: 'Mattina attiva, pomeriggio libero' },
  { id: 'intense', label: 'Intenso', hint: 'Massimizza esperienze ogni giorno' },
];

export const BUDGET_OPTIONS: { id: PlannerBudget; label: string; hint: string }[] = [
  { id: 'budget', label: 'Economico', hint: 'Ostelli, street food, trasporti locali' },
  { id: 'mid', label: 'Medio', hint: 'Hotel 3★, ristoranti misti' },
  { id: 'premium', label: 'Premium', hint: 'Comfort alto, esperienze selezionate' },
];

export const INTEREST_OPTIONS: { id: string; label: string; emoji: string }[] = [
  { id: 'photography', label: 'Fotografia', emoji: '📸' },
  { id: 'nature', label: 'Natura', emoji: '🌿' },
  { id: 'beaches', label: 'Spiagge', emoji: '🏖️' },
  { id: 'nightlife', label: 'Vita notturna', emoji: '🌙' },
  { id: 'history', label: 'Storia', emoji: '📜' },
  { id: 'art', label: 'Arte', emoji: '🎨' },
  { id: 'hiking', label: 'Trekking', emoji: '🥾' },
  { id: 'food', label: 'Gastronomia', emoji: '🍽️' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'wellness', label: 'Benessere', emoji: '🧘' },
  { id: 'family', label: 'Family friendly', emoji: '👨‍👩‍👧' },
  { id: 'local', label: 'Vita locale', emoji: '🏘️' },
];

export const ACCOMMODATION_OPTIONS: { id: PlannerAccommodation; label: string }[] = [
  { id: 'any', label: 'Indifferente' },
  { id: 'hostel', label: 'Ostello / social' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'apartment', label: 'Appartamento' },
];

export const EXPERIENCE_OPTIONS: { id: PlannerExperience; label: string; hint: string }[] = [
  { id: 'first_time', label: 'Prima volta', hint: 'Serve più guida e classici' },
  { id: 'been_before', label: 'Ci sono già stato', hint: 'Mix classici + gemme nascoste' },
  { id: 'expert', label: 'Conosco bene', hint: 'Proposte originali, meno turistico' },
];