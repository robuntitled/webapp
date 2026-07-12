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

/** Intenti supportati dall'orchestrator — contratto UI ↔ backend */
export type ComposerGenerateIntent = 'suggest_day' | 'regenerate_block' | 'add_alternatives';

/** Richiesta generazione giornata (draft pre-pubblicazione o trip esistente) */
export type ComposerGenerateRequest = {
  destination: string;
  destinationMeta?: DestinationMeta;
  dayIndex: number;
  date: string;
  dayTitle?: string;
  startDate: string;
  endDate: string;
  planningMode: 'solo' | 'group';
  maxParticipants: number;
  intent: ComposerGenerateIntent;
  /** Blocchi già presenti nel giorno attivo */
  currentDayBlocks?: ComposerBlock[];
  /** Riassunto blocchi altri giorni (anti-ripetizione) */
  otherDaysSummary?: string;
  targetBlockTypes?: ComposerBlockType[];
  tripId?: string;
};

export type ComposerGenerateSource = 'mock' | 'ai' | 'cache';

export type ComposerTravelFlightQuote = {
  price: number;
  currency: string;
  origin: string;
  destination: string;
  airline?: string | null;
  affiliateUrl?: string | null;
  fromCache: boolean;
};

export type ComposerTravelQuotes = {
  flight?: ComposerTravelFlightQuote;
  hotel?: { affiliateUrl?: string | null };
};

export type ComposerGenerateMeta = {
  source: ComposerGenerateSource;
  generatedAt: string;
  latencyMs: number;
  model?: string;
  version: string;
};

/** Risposta JSON sync — consumata direttamente dalla UI */
export type ComposerGenerateResponse = {
  dayIndex: number;
  date: string;
  suggestedTitle: string;
  blocks: ComposerBlock[];
  quotes?: ComposerTravelQuotes;
  warnings: string[];
  meta: ComposerGenerateMeta;
};