import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { assertTripRole } from '@/lib/auth/assert-trip-role';
import {
  getPriceWatchesForTrip,
  refreshFlightPriceWatch,
  refreshHotelPriceWatch,
} from '@/lib/data/price-watches';
import { fetchTripById } from '@/lib/data/trips';
import { z } from 'zod';

const bodySchema = z.object({
  tripId: z.string().uuid(),
  refresh: z.enum(['flight', 'hotel', 'all']).optional().default('all'),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const tripId = new URL(request.url).searchParams.get('tripId');
  if (!tripId) {
    return NextResponse.json({ error: 'tripId richiesto' }, { status: 400 });
  }

  const watches = await getPriceWatchesForTrip(tripId);
  return NextResponse.json({ watches });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  }

  const { tripId, refresh } = parsed.data;

  try {
    await assertTripRole(tripId, session.user.id, 'editor');
  } catch {
    return NextResponse.json({ error: 'Solo organizzatori e co-piloti possono aggiornare i prezzi' }, { status: 403 });
  }

  const trip = await fetchTripById(tripId, session.user.id);
  if (!trip) {
    return NextResponse.json({ error: 'Viaggio non trovato' }, { status: 404 });
  }

  const adults = Math.min(trip.maxParticipants, 9);
  const results = [];

  if (refresh === 'flight' || refresh === 'all') {
    const flight = await refreshFlightPriceWatch({
      tripId,
      userId: session.user.id,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      adults,
    });
    if (flight) results.push(flight);
  }

  if (refresh === 'hotel' || refresh === 'all') {
    const hotel = await refreshHotelPriceWatch({
      tripId,
      userId: session.user.id,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
    });
    if (hotel) results.push(hotel);
  }

  const watches = await getPriceWatchesForTrip(tripId);

  return NextResponse.json({
    watches,
    refreshed: results.length,
    disclaimer:
      'Prezzi volo da cache Travelpayouts (indicativi). Hotel: cerca sul motore affiliate per tariffe aggiornate.',
  });
}