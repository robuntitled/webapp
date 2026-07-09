export type TripCreator = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
};

export type TripParticipant = {
  user_id: string;
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
  creator: TripCreator | null;
  isFavorited: boolean;
  trip_participants?: TripParticipant[];
  favorite_trips?: { user_id: string }[];
};