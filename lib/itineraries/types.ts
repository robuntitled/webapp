export type ItineraryPoi = {
  name: string;
  priority: 'core' | 'optional';
  half_or_full: 'half' | 'full';
};

export type ItineraryDay = {
  day_number: number;
  title: string;
  description: string;
  area_segment: string;
  pois: ItineraryPoi[];
  transfer?: 'internal_flight' | 'ferry' | 'bus' | 'none';
  is_arrival: boolean;
  is_departure: boolean;
  /** WGS84 — posizione tappa sulla mappa locale. */
  lat?: number;
  lng?: number;
};

export type ItineraryHotel = {
  area_segment: string;
  name_or_zone: string;
  notes: string;
};

export type ItineraryPaidActivity = {
  title: string;
  day_number: number;
  slot: 'morning' | 'afternoon' | 'evening';
  hint: string;
};

export type ItineraryBudget = {
  flights_hint: number;
  hotel_hint: number;
  activities_hint: number;
  food_hint: number;
  total_hint: number;
};

export type ItineraryTemplate = {
  template_id: string;
  destination_slug: string;
  destination_name: string;
  duration_days: number;
  style?: 'relax' | 'avventura' | 'estremo' | 'entertainment' | 'adventure';
  title: string;
  summary: string;
  budget_orientative_eur: ItineraryBudget;
  days: ItineraryDay[];
  hotels: ItineraryHotel[];
  paid_activities: ItineraryPaidActivity[];
  logistics_notes?: string;
  status: 'draft' | 'published';
  hub_iata?: string;
  origin_iata_default?: string;
};

export type TravelMode = 'solo' | 'friends' | 'group';

export type PracticeStatus = 'draft' | 'confirmed' | 'preparing' | 'ready' | 'cancelled';

export type PracticeRow = {
  id: string;
  user_id: string;
  /** M2: può essere null o `viaggio-libero` se senza itinerario. */
  template_id: string | null;
  edition_id: string | null;
  mode: TravelMode;
  date_from: string;
  date_to: string;
  status: PracticeStatus;
  flight_confirmed_at: string | null;
  hotel_confirmed_at: string | null;
  activity_confirmed_at: string | null;
  /** Legacy: primo / unico volo (pre-M1). */
  flight_booking?: import('./bookings').FlightBookingRecap | null;
  /** M1: elenco voli (quando la migrazione è applicata). */
  flight_bookings?: import('./bookings').FlightBookingRecap[] | null;
  hotel_bookings?: import('./bookings').HotelBookingRecap[] | null;
  activity_bookings?: import('./bookings').ActivityBookingRecap[] | null;
  /** M2: tratte pianificate (intenzioni). */
  planned_legs?: import('./free-trip').PlannedLeg[] | null;
  destination_label?: string | null;
  destination_iata?: string | null;
};

export type EditionType = 'official' | 'private';

export type EditionStatus = 'open' | 'formed' | 'locked' | 'closed';

export type EditionMemberStatus = 'interested' | 'confirmed' | 'left';

export type OfficialEditionSeed = {
  template_id: string;
  date_from: string;
  date_to: string;
  min_confirmed: number;
  /**
   * Tour operator partner (modello B). Assente/null = partenza «In arrivo», non iscrivibile (A4).
   * Nessuna scrittura DB: solo codice/seed.
   */
  tourOperatorId?: string | null;
};

export type OfficialEditionCard = {
  id: string;
  template_id: string;
  date_from: string;
  date_to: string;
  min_confirmed: number;
  confirmed_count: number;
  interested_count?: number;
  status: string;
  edition_type?: 'official' | 'private';
  /** A4: senza tour operator → In arrivo, non iscrivibile. */
  coming_soon?: boolean;
};
