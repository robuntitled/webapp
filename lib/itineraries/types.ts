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
  style?: 'relax' | 'avventura' | 'estremo';
  title: string;
  summary: string;
  budget_orientative_eur: ItineraryBudget;
  days: ItineraryDay[];
  hotels: ItineraryHotel[];
  paid_activities: ItineraryPaidActivity[];
  logistics_notes?: string;
  status: 'draft' | 'published';
};

export type TravelMode = 'solo' | 'friends' | 'group';

export type PracticeStatus = 'draft' | 'confirmed' | 'preparing' | 'ready' | 'cancelled';

export type PracticeRow = {
  id: string;
  user_id: string;
  template_id: string;
  edition_id: string | null;
  mode: TravelMode;
  date_from: string;
  date_to: string;
  status: PracticeStatus;
  flight_confirmed_at: string | null;
  hotel_confirmed_at: string | null;
  activity_confirmed_at: string | null;
  flight_booking?: import('./bookings').FlightBookingRecap | null;
  hotel_bookings?: import('./bookings').HotelBookingRecap[] | null;
  activity_bookings?: import('./bookings').ActivityBookingRecap[] | null;
};

export type EditionType = 'official' | 'private';

export type EditionStatus = 'open' | 'formed' | 'locked' | 'closed';

export type EditionMemberStatus = 'interested' | 'confirmed' | 'left';

export type OfficialEditionSeed = {
  template_id: string;
  date_from: string;
  date_to: string;
  min_confirmed: number;
};

export type OfficialEditionCard = {
  id: string;
  template_id: string;
  date_from: string;
  date_to: string;
  min_confirmed: number;
  confirmed_count: number;
  status: string;
};
