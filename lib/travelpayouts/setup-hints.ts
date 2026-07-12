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
  hasDataApi: boolean;
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
      'Il marker attuale è un ID demo del repository — sostituiscilo con il tuo Partner ID Travelpayouts su Vercel e redeploy.'
    );
  }

  if (!config.hasDataApi) {
    hints.push(
      'Opzionale: TRAVELPAYOUTS_API_TOKEN per le stime prezzo in cache (stesso pannello API token).'
    );
  }

  if (config.marker && !usingDemoMarker) {
    hints.push(
      'Se i link danno "marker is not subscribed to campaign": iscriviti ad Aviasales e Booking.com nella dashboard Travelpayouts (Programs → Join).'
    );
    hints.push(
      'Hotellook è chiuso dal 2025 — NomadLink usa ora Booking.com per gli hotel.'
    );
  }

  return {
    hasMarker: Boolean(config.marker),
    hasDataApi: config.hasDataApi,
    hasAffiliate: config.hasAffiliate,
    usingDemoMarker,
    hints,
    programsRequired: REQUIRED_TRAVEL_PROGRAMS,
  };
}