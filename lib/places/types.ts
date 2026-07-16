export type PlaceResult = {
  id: string;
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
  placeType: string;
  placeTypeLabel: string;
  country?: string;
  countryCode?: string;
};

export type NominatimAddress = {
  country?: string;
  state?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  country_code?: string;
};

export type NominatimNameDetails = Record<string, string>;

export type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class: string;
  name?: string;
  namedetails?: NominatimNameDetails;
  address?: NominatimAddress;
};