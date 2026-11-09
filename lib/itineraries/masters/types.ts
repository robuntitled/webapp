/**
 * Master route: ordered stops with nights and priority.
 * The remapper compresses/extends into day-by-day Italian itineraries.
 */

export type StopPriority = 'core' | 'extend' | 'optional';
export type TransferMode = 'none' | 'internal_flight' | 'ferry' | 'bus' | 'train';

export type MasterProvenance = {
  id: string;
  claimIt: string;
  sourceUrl: string;
  attribution: string;
  license: 'cc-by-sa' | 'odbl-osm' | 'official-cite' | 'catalog';
  retrievedOn: string;
};

export type MasterSight = {
  nameIt: string;
  priority: 'core' | 'optional';
  /** Provenance id — if missing, flagged in «Da verificare». */
  provenanceId?: string;
};

export type MasterTransfer = {
  mode: TransferMode;
  /** Hours door-to-door when known; null → unverified. */
  durationHours: number | null;
  verified: boolean;
  notesIt?: string;
  provenanceId?: string;
};

export type MasterStop = {
  id: string;
  nameIt: string;
  /** Recommended nights at this base (excluding arrival-only half-days handled by remapper). */
  nightsMin: number;
  nightsIdeal: number;
  priority: StopPriority;
  lat: number;
  lng: number;
  /** Near international/domestic hub — prefer arrival/departure here. */
  airportHub?: boolean;
  hubIata?: string;
  sights: MasterSight[];
  /** Transfer FROM this stop TO the next (omitted on last). */
  transferToNext?: MasterTransfer;
  descriptionIt: string;
};

export type DestinationMaster = {
  slug: string;
  nameIt: string;
  summaryIt: string;
  /** Ideal total trip days (arrival+nights+departure ≈ nights+1). */
  idealTripDays: number;
  styleDefault: 'relax' | 'divertimento' | 'avventura';
  hubs: string[];
  stops: MasterStop[];
  provenance: MasterProvenance[];
  logisticsNotesIt: string;
  /** Orientative budget hints — never presented as fares. */
  budgetOrientativeEur: {
    flights_hint: number;
    hotel_hint: number;
    activities_hint: number;
    food_hint: number;
    total_hint: number;
  };
};
