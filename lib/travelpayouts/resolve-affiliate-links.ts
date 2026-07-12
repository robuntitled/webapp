import 'server-only';

import {
  buildAviasalesDirectSearchUrl,
  buildBookingDirectSearchUrl,
} from '@/lib/travelpayouts/affiliate-links';
import {
  buildTripFlightSearchUrl,
  buildTripHotelSearchUrl,
  type FlightSearchParams,
} from '@/lib/travelpayouts/flight-search';
import { createPartnerAffiliateLink } from '@/lib/travelpayouts/partner-links-api';

export async function resolveTripFlightAffiliateUrl(
  params: FlightSearchParams
): Promise<{ url: string | null; warnings: string[] }> {
  const warnings: string[] = [];
  const fallback = buildTripFlightSearchUrl(params);
  const subId = params.subId ?? (params.tripId ? `trip_${params.tripId}_voli` : 'voli');
  const direct = buildAviasalesDirectSearchUrl(params);

  if (!direct) {
    if (!fallback) warnings.push('Impossibile costruire ricerca volo — verifica destinazione e date');
    return { url: fallback, warnings };
  }

  const partner = await createPartnerAffiliateLink(direct, subId);
  if (partner.url) return { url: partner.url, warnings };
  if (partner.error) warnings.push(`Voli: ${partner.error}`);

  return { url: fallback, warnings };
}

export async function resolveTripHotelAffiliateUrl(
  tripId: string | undefined,
  hotelParams: { destination: string; startDate: string; endDate: string }
): Promise<{ url: string | null; warnings: string[] }> {
  const warnings: string[] = [];
  const subId = tripId ? `trip_${tripId}_hotel` : 'hotel';
  const fallback = buildTripHotelSearchUrl(tripId, hotelParams);
  const direct = buildBookingDirectSearchUrl({ ...hotelParams, tripId, subId });

  const partner = await createPartnerAffiliateLink(direct, subId);
  if (partner.url) return { url: partner.url, warnings };
  if (partner.error) warnings.push(`Hotel: ${partner.error}`);

  return { url: fallback, warnings };
}