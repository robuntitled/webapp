export type TripCreator = {
  id: string;
  username?: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
};

import type { TripParticipantRole } from '@/lib/trips/roles';

export type TripPlanningMode = 'solo' | 'group';

export type TripParticipantUser = {
  id: string;
  username?: string | null;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
};

export type TripParticipant = {
  user_id: string;
  role?: TripParticipantRole;
  joinedAt?: string | null;
  seatStatus?: 'provisional' | 'confirmed' | null;
  flightConfirmedAt?: string | null;
  flightBookingRef?: string | null;
  hotelConfirmedAt?: string | null;
  hotelMatchesGroup?: boolean | null;
  user?: TripParticipantUser | null;
};

export type TripWithRelations = {
  id: string;
  title: string;
  destination: string;
  description: string;
  imageUrl: string | null;
  price: number;
  startDate: string;
  endDate: string;
  minParticipants: number;
  maxParticipants: number;
  minAge: number;
  maxAge: number;
  planningMode?: TripPlanningMode;
  composerVersion?: number | null;
  templateId?: string | null;
  destinationId?: string | null;
  durationDays?: number | null;
  hotelRule?: 'A' | 'B' | 'C' | null;
  status?: 'draft' | 'forming' | 'confirmed' | 'published' | 'archived' | null;
  boostUntil?: string | null;
  /** Presente dal DB; usato se la relation `creator` non risolve. */
  creator_id?: string | null;
  creator: TripCreator | null;
  isFavorited: boolean;
  myRole?: TripParticipantRole;
  participantCount?: number;
  confirmedFlightCount?: number;
  activityTicketCount?: number;
  trip_participants?: TripParticipant[];
  favorite_trips?: { user_id: string }[];
};