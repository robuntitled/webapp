import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { buildTripFlightSearchUrl, buildTripHotelSearchUrl } from '@/lib/travelpayouts/flight-search';
import { fetchCheapestFlightQuote } from '@/lib/travelpayouts/data-api';

export type PriceWatchRow = {
  id: string;
  trip_id: string;
  watch_type: 'flight' | 'hotel';
  destination_text: string;
  start_date: string;
  end_date: string;
  adults: number;
  last_price: number | null;
  last_currency: string;
  affiliate_url: string | null;
  checked_at: string | null;
};

export async function getPriceWatchesForTrip(tripId: string): Promise<PriceWatchRow[]> {
  const { data, error } = await supabaseAdmin
    .from('price_watches')
    .select(
      'id, trip_id, watch_type, destination_text, start_date, end_date, adults, last_price, last_currency, affiliate_url, checked_at'
    )
    .eq('trip_id', tripId)
    .order('watch_type');

  if (error) {
    if (error.code === '42P01') return [];
    console.error('price_watches fetch:', error.message);
    return [];
  }

  return (data ?? []) as PriceWatchRow[];
}

export async function refreshFlightPriceWatch(params: {
  tripId: string;
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
}): Promise<PriceWatchRow | null> {
  const quote = await fetchCheapestFlightQuote({
    destination: params.destination,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const affiliateUrl = buildTripFlightSearchUrl({
    tripId: params.tripId,
    destination: params.destination,
    startDate: params.startDate,
    endDate: params.endDate,
    adults: params.adults,
  });

  const payload = {
    trip_id: params.tripId,
    created_by: params.userId,
    watch_type: 'flight' as const,
    destination_text: params.destination,
    start_date: params.startDate,
    end_date: params.endDate,
    adults: params.adults,
    last_price: quote?.price ?? null,
    last_currency: quote?.currency ?? 'EUR',
    affiliate_url: affiliateUrl,
    checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('price_watches')
    .upsert(payload, { onConflict: 'trip_id,watch_type' })
    .select(
      'id, trip_id, watch_type, destination_text, start_date, end_date, adults, last_price, last_currency, affiliate_url, checked_at'
    )
    .single();

  if (error) {
    console.error('price_watches upsert flight:', error.message);
    return null;
  }

  return data as PriceWatchRow;
}

export async function refreshHotelPriceWatch(params: {
  tripId: string;
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
}): Promise<PriceWatchRow | null> {
  const affiliateUrl = buildTripHotelSearchUrl(params.tripId, {
    destination: params.destination,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const payload = {
    trip_id: params.tripId,
    created_by: params.userId,
    watch_type: 'hotel' as const,
    destination_text: params.destination,
    start_date: params.startDate,
    end_date: params.endDate,
    adults: 1,
    last_price: null,
    last_currency: 'EUR',
    affiliate_url: affiliateUrl,
    checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('price_watches')
    .upsert(payload, { onConflict: 'trip_id,watch_type' })
    .select(
      'id, trip_id, watch_type, destination_text, start_date, end_date, adults, last_price, last_currency, affiliate_url, checked_at'
    )
    .single();

  if (error) {
    console.error('price_watches upsert hotel:', error.message);
    return null;
  }

  return data as PriceWatchRow;
}