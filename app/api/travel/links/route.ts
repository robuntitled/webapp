import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTravelpayoutsConfig } from '@/lib/travelpayouts/config';
import {
  buildTripFlightSearchUrl,
  buildTripHotelSearchUrl,
} from '@/lib/travelpayouts/flight-search';
import { getTravelSetupStatus } from '@/lib/travelpayouts/setup-hints';

const querySchema = z.object({
  destination: z.string().min(2).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tripId: z.string().uuid().optional(),
  adults: z.coerce.number().int().min(1).max(9).optional(),
  origin: z
    .string()
    .regex(/^[A-Za-z]{3}$/)
    .optional(),
});

export async function GET(request: Request) {
  const config = getTravelpayoutsConfig();
  const setup = getTravelSetupStatus();
  const { searchParams } = new URL(request.url);

  const parsed = querySchema.safeParse({
    destination: searchParams.get('destination'),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
    tripId: searchParams.get('tripId') ?? undefined,
    adults: searchParams.get('adults') ?? undefined,
    origin: searchParams.get('origin') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  const { destination, startDate, endDate, tripId, adults, origin } = parsed.data;

  const flightUrl = buildTripFlightSearchUrl({
    tripId,
    destination,
    startDate,
    endDate,
    adults: adults ?? 1,
    originIata: origin?.toUpperCase(),
  });

  const hotelUrl = buildTripHotelSearchUrl(tripId, {
    destination,
    startDate,
    endDate,
  });

  const missing: string[] = [];
  if (!flightUrl) missing.push('Link voli non generato — verifica marker, destinazione e date');
  if (!hotelUrl) missing.push('Link hotel non generato — verifica marker');

  return NextResponse.json({
    configured: config.isConfigured,
    mode: config.mode,
    hasDataApi: config.hasDataApi,
    hasAffiliate: config.hasAffiliate,
    flightUrl,
    hotelUrl,
    setup,
    missing: missing.length > 0 ? missing : undefined,
  });
}