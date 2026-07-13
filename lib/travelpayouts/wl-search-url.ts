import { primaryOriginIata } from '@/lib/composer/origins';
import { buildFlightSearchCode } from '@/lib/travelpayouts/flight-search';
import type { ComposerDraft } from '@/types/composer';

export const WL_FLIGHT_SEARCH_PATH = '/prenota/voli/ricerca';

export function buildWlFlightSearchPageUrl(draft: Pick<
  ComposerDraft,
  'destination' | 'startDate' | 'endDate' | 'planningMode' | 'maxParticipants' | 'organizerOrigin'
>): string {
  const originIata = primaryOriginIata(draft as ComposerDraft);
  const adults =
    draft.planningMode === 'group' ? Math.min(Math.max(draft.maxParticipants, 1), 9) : 1;

  const params = new URLSearchParams({
    destination: draft.destination,
    startDate: draft.startDate,
    endDate: draft.endDate,
    origin: originIata,
    adults: String(adults),
  });

  return `${WL_FLIGHT_SEARCH_PATH}?${params.toString()}`;
}

export function buildWlFlightSearchCodeFromParams(params: {
  destination: string;
  startDate: string;
  endDate: string;
  originIata: string;
  adults?: number;
}): string | null {
  return buildFlightSearchCode({
    destination: params.destination,
    startDate: params.startDate,
    endDate: params.endDate,
    originIata: params.originIata,
    adults: params.adults ?? 1,
  });
}