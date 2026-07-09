import 'server-only';

import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import { resolveDestinationIata } from '@/lib/travelpayouts/iata';

const DATA_API_BASE = 'https://api.travelpayouts.com/v1';

export type FlightPriceQuote = {
  price: number;
  currency: string;
  airline: string | null;
  flightNumber: number | null;
  departureAt: string | null;
  returnAt: string | null;
  expiresAt: string | null;
  transfers: number | null;
  origin: string;
  destination: string;
  source: 'cache';
};

type CheapTicketEntry = {
  price: number;
  airline?: string;
  flight_number?: number;
  departure_at?: string;
  return_at?: string;
  expires_at?: string;
  transfers?: number;
};

type CheapTicketsResponse = {
  success: boolean;
  data: Record<string, Record<string, CheapTicketEntry>> | null;
  error: string | null;
};

function formatApiDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function extractCheapestTicket(data: CheapTicketsResponse['data']): CheapTicketEntry | null {
  if (!data) return null;

  let cheapest: CheapTicketEntry | null = null;

  for (const destinationBucket of Object.values(data)) {
    for (const entry of Object.values(destinationBucket)) {
      if (!entry?.price) continue;
      if (!cheapest || entry.price < cheapest.price) {
        cheapest = entry;
      }
    }
  }

  return cheapest;
}

export function getTravelpayoutsApiToken(): string | null {
  return process.env.TRAVELPAYOUTS_API_TOKEN?.trim() || null;
}

export function isDataApiConfigured(): boolean {
  return Boolean(getTravelpayoutsApiToken());
}

export async function fetchCheapestFlightQuote(params: {
  originIata?: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency?: string;
}): Promise<FlightPriceQuote | null> {
  const token = getTravelpayoutsApiToken();
  if (!token) return null;

  const config = getTravelpayoutsConfig();
  const origin = (params.originIata ?? config.defaultOriginIata).toUpperCase();
  const destinationIata = resolveDestinationIata(params.destination);

  if (!destinationIata) return null;

  const url = new URL(`${DATA_API_BASE}/prices/cheap`);
  url.searchParams.set('origin', origin);
  url.searchParams.set('destination', destinationIata);
  url.searchParams.set('depart_date', formatApiDate(params.startDate));
  url.searchParams.set('return_date', formatApiDate(params.endDate));
  url.searchParams.set('currency', params.currency ?? 'EUR');

  const response = await fetch(url, {
    headers: {
      'x-access-token': token,
      'Accept-Encoding': 'gzip, deflate',
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Travelpayouts Data API error: ${response.status}`);
  }

  const payload = (await response.json()) as CheapTicketsResponse;

  if (!payload.success) {
    throw new Error(payload.error ?? 'Travelpayouts Data API request failed');
  }

  const ticket = extractCheapestTicket(payload.data);
  if (!ticket) return null;

  return {
    price: ticket.price,
    currency: params.currency ?? 'EUR',
    airline: ticket.airline ?? null,
    flightNumber: ticket.flight_number ?? null,
    departureAt: ticket.departure_at ?? null,
    returnAt: ticket.return_at ?? null,
    expiresAt: ticket.expires_at ?? null,
    transfers: ticket.transfers ?? null,
    origin,
    destination: destinationIata,
    source: 'cache',
  };
}