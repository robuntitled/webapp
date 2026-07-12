import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';

/** Marker demo nel repo — non iscritto ai programmi, genera errori tp.media */
export const LEGACY_DEMO_MARKER = '748861';

export const REQUIRED_TRAVEL_PROGRAMS = [
  {
    id: 'aviasales',
    name: 'Aviasales',
    purpose: 'voli',
    url: 'https://app.travelpayouts.com/programs/100/about',
  },
  {
    id: 'booking',
    name: 'Booking.com',
    purpose: 'hotel',
    url: 'https://app.travelpayouts.com/programs/84/about',
  },
] as const;

export type TravelSetupStatus = {
  hasMarker: boolean;
  hasTrsId: boolean;
  hasDataApi: boolean;
  hasLinksApi: boolean;
  hasAffiliate: boolean;
  usingDemoMarker: boolean;
  hints: string[];
  programsRequired: typeof REQUIRED_TRAVEL_PROGRAMS;
};

export function getTravelSetupStatus(): TravelSetupStatus {
  const config = getTravelpayoutsConfig();
  const hints: string[] = [];
  const usingDemoMarker = config.marker === LEGACY_DEMO_MARKER;

  if (!config.marker) {
    hints.push(
      'Aggiungi NEXT_PUBLIC_TRAVELPAYOUTS_MARKER su Vercel con il tuo Partner ID (Dashboard → Profile → API token).'
    );
  } else if (usingDemoMarker) {
    hints.push(
      'Il marker attuale è un ID demo — sostituiscilo con il tuo Partner ID Travelpayouts su Vercel e redeploy.'
    );
  }

  if (config.marker && !config.trsId) {
    hints.push(
      'Aggiungi TRAVELPAYOUTS_TRS_ID su Vercel: Tools → Projects → copia l\'ID del Project collegato al sito.'
    );
  }

  if (!config.hasDataApi) {
    hints.push(
      'Aggiungi TRAVELPAYOUTS_API_TOKEN (Profile → API token) per link affiliate validati e stime prezzo.'
    );
  }

  if (config.marker && !usingDemoMarker) {
    hints.push(
      'Errore "marker is not subscribed to campaign": nel Project Travelpayouts connetti Aviasales + Booking.com (Programs → Join → collega al Project).'
    );
  }

  return {
    hasMarker: Boolean(config.marker),
    hasTrsId: Boolean(config.trsId),
    hasDataApi: config.hasDataApi,
    hasLinksApi: config.hasLinksApi,
    hasAffiliate: config.hasAffiliate,
    usingDemoMarker,
    hints,
    programsRequired: REQUIRED_TRAVEL_PROGRAMS,
  };
}