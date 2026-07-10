export type ComposerBlockType =
  | 'flight'
  | 'hotel'
  | 'attraction'
  | 'transport'
  | 'meal'
  | 'free_time'
  | 'note'
  | 'activity';

export type ComposerAlternative = {
  id: string;
  label: string;
  price?: number | null;
  currency?: string;
  notes?: string;
  affiliateUrl?: string | null;
  meta?: Record<string, unknown>;
};

export type ComposerBlock = {
  id: string;
  type: ComposerBlockType;
  sortOrder: number;
  content: Record<string, unknown>;
  alternatives: ComposerAlternative[];
  selectedAlternativeId: string | null;
};

export type ComposerDay = {
  dayIndex: number;
  date: string;
  title: string;
  blocks: ComposerBlock[];
};

export type DestinationMeta = {
  label: string;
  lat: number;
  lng: number;
  country?: string;
  countryCode?: string;
  placeType?: string;
  placeTypeLabel?: string;
  subtitle?: string;
  osmId?: string;
};

export type ComposerDraft = {
  title: string;
  destination: string;
  destinationMeta?: DestinationMeta;
  startDate: string;
  endDate: string;
  planningMode: 'solo' | 'group';
  maxParticipants: number;
  days: ComposerDay[];
};

export type ComposerDestination = {
  id: string;
  label: string;
  emoji: string;
  region: string;
  vibe: string;
  gradient: string;
  lat: number;
  lng: number;
};