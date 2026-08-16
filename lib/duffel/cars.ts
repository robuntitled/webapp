import 'server-only';

import { duffelFetch, type DuffelFetchOptions } from '@/lib/duffel/client';
import { getDuffelCarsRadiusKm } from '@/lib/duffel/config';
import {
  buildCarsSearchBody,
  type DuffelCarRate,
  type DuffelCharge,
  type DuffelCondition,
  type DuffelPrivacyPolicy,
} from '@/lib/duffel/cars-map';

export type CarsSearchInput = {
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  driverAge: number;
  residenceCountryCode: string;
  radiusKm?: number;
};

export type DuffelCarsSearch = {
  id: string;
  live_mode?: boolean;
  rates?: DuffelCarRate[];
};

export type DuffelCarsQuote = {
  id: string;
  rate_id?: string;
  search_id?: string;
  live_mode?: boolean;
  payment_type?: string;
  total_amount?: string;
  total_currency?: string;
  base_amount?: string;
  base_currency?: string;
  car?: DuffelCarRate['car'];
  supplier?: DuffelCarRate['supplier'];
  pickup_location?: DuffelCarRate['pickup_location'];
  dropoff_location?: DuffelCarRate['dropoff_location'];
  pickup_date?: string;
  pickup_time?: string;
  dropoff_date?: string;
  dropoff_time?: string;
  conditions?: DuffelCondition[] | null;
  charges?: DuffelCharge[] | null;
  privacy_policies?: DuffelPrivacyPolicy[] | null;
};

export type DuffelCarsBooking = DuffelCarsQuote & {
  reference?: string;
  status?: string;
  confirmed_at?: string | null;
  quote_id?: string;
  driver?: {
    given_name?: string;
    family_name?: string;
    email?: string;
    phone_number?: string;
    date_of_birth?: string;
  };
};

type Envelope<T> = { data: T };

export async function searchCars(input: CarsSearchInput): Promise<DuffelCarsSearch> {
  const json = await duffelFetch<Envelope<DuffelCarsSearch>>('/cars/search', {
    method: 'POST',
    body: JSON.stringify(
      buildCarsSearchBody({
        ...input,
        radiusKm: input.radiusKm ?? getDuffelCarsRadiusKm(),
      })
    ),
    timeoutMs: 50_000,
  });
  return json.data;
}

export async function createCarQuote(rateId: string): Promise<DuffelCarsQuote> {
  const json = await duffelFetch<Envelope<DuffelCarsQuote>>('/cars/quotes', {
    method: 'POST',
    body: JSON.stringify({ data: { rate_id: rateId } }),
    timeoutMs: 30_000,
  });
  return json.data;
}

export type CreateCarBookingInput = {
  quoteId: string;
  driver: {
    given_name: string;
    family_name: string;
    email: string;
    phone_number: string;
    date_of_birth: string;
  };
  metadata?: Record<string, string>;
};

export async function createCarBooking(
  input: CreateCarBookingInput,
  device?: Pick<DuffelFetchOptions, 'deviceIp' | 'deviceUserAgent'>
): Promise<DuffelCarsBooking> {
  const json = await duffelFetch<Envelope<DuffelCarsBooking>>('/cars/bookings', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        quote_id: input.quoteId,
        driver: input.driver,
        metadata: input.metadata,
      },
    }),
    timeoutMs: 40_000,
    deviceIp: device?.deviceIp,
    deviceUserAgent: device?.deviceUserAgent,
  });
  return json.data;
}
