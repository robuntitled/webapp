import type { PlannerProfile } from '@/types/planner';

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
  /** Promemoria liberi per la giornata (metafora "pagina del libro") */
  notes?: string;
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

/** Aeroporto/città di partenza (organizzatore o amico) */
export type ComposerOrigin = {
  id: string;
  label: string;
  city: string;
  iata: string;
  role: 'organizer' | 'crew';
  airportName?: string;
};

export type ComposerBookableProvider = 'liteapi' | 'viator' | 'google';

export type ComposerBookableKind = 'flight' | 'hotel' | 'activity' | 'attraction';

/** Offerta/luogo trovato in composer (assistente o enrichment) e riusato in prenotazione. */
export type ComposerBookablePick = {
  id: string;
  kind: ComposerBookableKind;
  provider: ComposerBookableProvider;
  title: string;
  lat?: number | null;
  lng?: number | null;
  photoUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  dayIndex?: number;
  blockId?: string;
  placeId?: string | null;
  hotelId?: string | null;
  offerId?: string | null;
  rateId?: string | null;
  address?: string | null;
  city?: string | null;
  stars?: number | null;
  rating?: number | null;
  roomName?: string | null;
  boardName?: string | null;
  freeCancellation?: boolean;
  checkIn?: string | null;
  checkOut?: string | null;
  origin?: string | null;
  destinationIata?: string | null;
  airline?: string | null;
  airlineCode?: string | null;
  airlineLogo?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  durationMinutes?: number | null;
  stops?: number | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
  hasReturn?: boolean;
  returnOrigin?: string | null;
  returnDestination?: string | null;
  returnAirline?: string | null;
  returnAirlineCode?: string | null;
  returnAirlineLogo?: string | null;
  returnDepartureAt?: string | null;
  returnArrivalAt?: string | null;
  returnDurationMinutes?: number | null;
  returnStops?: number | null;
  returnFlightNumber?: string | null;
  adults?: number;
  productCode?: string | null;
  bookingUrl?: string | null;
};

export type ComposerDraft = {
  title: string;
  destination: string;
  destinationMeta?: DestinationMeta;
  /** Mete multiple selezionate nello step destinazione */
  destinations?: DestinationMeta[];
  startDate: string;
  endDate: string;
  planningMode: 'solo' | 'group';
  maxParticipants: number;
  minParticipants?: number;
  /** Partenza di chi organizza il viaggio */
  organizerOrigin?: ComposerOrigin;
  /** Partenze amici (gruppo) — ognuno dal proprio aeroporto vicino */
  crewOrigins?: ComposerOrigin[];
  /** Profilo intake — persistito su Supabase, usato dall'LLM */
  plannerProfile?: PlannerProfile;
  /** Budget indicativo opzionale (landing) */
  budgetHint?: number;
  /** Regola hotel Excel: A default, B condivise, C un booker */
  hotelRule?: 'A' | 'B' | 'C';
  templateId?: string;
  catalogDestinationId?: string;
  durationDays?: number;
  days: ComposerDay[];
  /** Copertina scelta da Pexels in pubblicazione */
  imageUrl?: string;
  /** Voli/hotel/attività già trovati (LiteAPI, Viator, Places) */
  bookablePicks?: ComposerBookablePick[];
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
  countryCode?: string;
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
  organizerOrigin?: ComposerOrigin;
  crewOrigins?: ComposerOrigin[];
  plannerProfile?: PlannerProfile;
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
  /** @deprecated TP affiliate — non usato; restiamo su LiteAPI */
  affiliateUrl?: string | null;
  /** LiteAPI offer id (Nuitee Connect Flights) */
  offerId?: string | null;
  fromCache: boolean;
  originLabel?: string;
  role?: ComposerOrigin['role'];
};

export type ComposerTravelQuotes = {
  /** Volo organizzatore (retrocompat) */
  flight?: ComposerTravelFlightQuote;
  /** Tutte le partenze (organizzatore + amici) */
  flights?: ComposerTravelFlightQuote[];
  hotel?: { affiliateUrl?: string | null };
};

export type ComposerGenerateMeta = {
  source: ComposerGenerateSource;
  generatedAt: string;
  latencyMs: number;
  model?: string;
  version: string;
};

/** Richiesta generazione itinerario completo (tutti i giorni in un job) */
export type ComposerTripGenerateRequest = {
  destination: string;
  destinationMeta?: DestinationMeta;
  startDate: string;
  endDate: string;
  /** Giorni presenti nel composer (date reali, anche se aggiunti a mano) */
  days: Array<{ dayIndex: number; date: string; title?: string }>;
  planningMode: 'solo' | 'group';
  maxParticipants: number;
  organizerOrigin?: ComposerOrigin;
  crewOrigins?: ComposerOrigin[];
  plannerProfile?: PlannerProfile;
  /** false = sola andata (niente volo di rientro nell'ultimo giorno) */
  roundtrip?: boolean;
  tripId?: string;
};

export type ComposerTripDayResult = {
  dayIndex: number;
  date: string;
  suggestedTitle: string;
  blocks: ComposerBlock[];
};

/** Cosa è stato agganciato a dati reali (vs. solo struttura AI/smart) */
export type ComposerTripEnrichment = {
  flights: boolean;
  hotels: boolean;
  activities: boolean;
  transfers: boolean;
};

export type ComposerTripGenerateResponse = {
  tripTitle: string;
  days: ComposerTripDayResult[];
  quotes?: ComposerTravelQuotes;
  warnings: string[];
  meta: ComposerGenerateMeta & {
    daysFilled: number;
    blocksTotal: number;
    enrichment: ComposerTripEnrichment;
  };
};

/** Avanzamento job multi-giorno, mostrato nella UI durante l'attesa */
export type ComposerJobProgress = {
  current: number;
  total: number;
  label: string;
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