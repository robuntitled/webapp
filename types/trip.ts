export type TripCreator = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
};

import type { TripParticipantRole } from '@/lib/trips/roles';

export type TripPlanningMode = 'solo' | 'group';

export type TripParticipantUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
};

export type TripParticipant = {
  user_id: string;
  role?: TripParticipantRole;
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
  creator: TripCreator | null;
  isFavorited: boolean;
  trip_participants?: TripParticipant[];
  favorite_trips?: { user_id: string }[];
};