import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { searchFlightRates } from '@/lib/liteapi/flights';
import { resolveFlightDestinationIata } from '@/lib/travel/iata';
import { normalizeCountryCode } from '@/lib/travel/airports-by-country';

const schema = z.object({
  destination: z.string().trim().min(2).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  originIata: z.string().trim().min(2).max(40).optional(),
  originCountry: z.string().trim().min(2).max(40).optional(),
  tripType: z.enum(['oneway', 'roundtrip']).optional().default('roundtrip'),
  adults: z.coerce.number().int().min(1).max(9).optional(),
  currency: z.string().trim().length(3).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Accedi per cercare voli.', code: 'auth_required' },
      { status: 401 }
    );
  }

  if (!isLiteApiConfigured()) {
    return NextResponse.json(
      {
        error: 'Servizio voli non configurato. Contatta il supporto.',
        configured: false,
        code: 'missing_key',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = schema.safeParse({
    destination: searchParams.get('destination'),
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate') ?? undefined,
    originIata: searchParams.get('originIata') ?? undefined,
    originCountry: searchParams.get('originCountry') ?? undefined,
    tripType: searchParams.get('tripType') ?? undefined,
    adults: searchParams.get('adults') ?? undefined,
    currency: searchParams.get('currency') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parametri non validi', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const dest = parsed.data.destination.trim();
  const destIata = resolveFlightDestinationIata(dest);

  if (!destIata) {
    return NextResponse.json({
      configured: true,
      found: false,
      count: 0,
      quote: null,
      offers: [],
      message:
        'Destinazione non riconosciuta. Prova una città (es. Londra, Parigi, Tokyo) o un codice aeroporto (LHR, CDG, NRT).',
      code: 'unknown_destination',
    });
  }

  let originCountry = parsed.data.originCountry;
  let originIata = parsed.data.originIata;
  if (!originCountry && originIata && normalizeCountryCode(originIata)) {
    originCountry = originIata;
    originIata = undefined;
  }

  try {
    const { offers, destinationIata, originsSearched } = await searchFlightRates({
      destination: destIata,
      departureDate: parsed.data.startDate,
      returnDate: parsed.data.tripType === 'oneway' ? null : parsed.data.endDate,
      tripType: parsed.data.tripType,
      originIata,
      originCountry,
      adults: parsed.data.adults,
      currency: parsed.data.currency?.toUpperCase() ?? 'EUR',
    });

    const cheapest = offers[0] ?? null;

    return NextResponse.json({
      configured: true,
      found: Boolean(cheapest),
      count: offers.length,
      quote: cheapest ?? null,
      offers: offers.slice(0, 30),
      destinationIata,
      originsSearched,
      tripType: parsed.data.tripType,
      message: cheapest
        ? undefined
        : originsSearched.length > 1
          ? `Nessun volo trovato da ${originsSearched.slice(0, 6).join(', ')}${originsSearched.length > 6 ? '…' : ''} verso ${destinationIata}. Prova altre date.`
          : `Nessun volo trovato per questa tratta. Prova altre date o aeroporti.`,
    });
  } catch (e) {
    if (e instanceof LiteApiError) {
      console.error('[flights]', e.status, e.message, e.body);
      const isAuth = e.status === 401 || /unauthor/i.test(e.message);
      return NextResponse.json(
        {
          error: isAuth
            ? 'Servizio voli temporaneamente non disponibile.'
            : e.message,
          configured: true,
          code: isAuth ? 'unauthorized' : 'search_error',
        },
        { status: isAuth ? 502 : e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[flights]', e);
    return NextResponse.json({ error: 'Errore ricerca voli.' }, { status: 500 });
  }
}
