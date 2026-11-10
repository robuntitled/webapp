import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardSearchApi } from '@/lib/api/request-guard';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { searchFlightRates } from '@/lib/liteapi/flights';
import { resolveFlightDestinationIata } from '@/lib/travel/iata';
import { normalizeCountryCode } from '@/lib/travel/airports-by-country';
import { dayChipFromOffers } from '@/lib/travel/day-flight-representative';

export const runtime = 'nodejs';
/** Long-haul probes (calendar ±3) often need 20–45s; keep under Vercel hobby/pro caps. */
export const maxDuration = 60;

const schema = z.object({
  destination: z.string().trim().min(2).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  originIata: z.string().trim().min(2).max(40).optional(),
  originCountry: z.string().trim().min(2).max(40).optional(),
  tripType: z.enum(['oneway', 'roundtrip']).optional().default('roundtrip'),
  adults: z.coerce.number().int().min(1).max(9).optional(),
  currency: z.string().trim().length(3).optional(),
  /** Compact badge payload for Organizza calendar (no offer list). */
  summary: z
    .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .optional(),
});

export async function GET(request: Request) {
  const gate = await guardSearchApi(request, 'liteapi-flights-search', {
    perUser: 20,
    perIp: 40,
    windowMs: 60_000,
  });
  if ('error' in gate) {
    return gate.error;
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
    summary: searchParams.get('summary') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parametri non validi', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const dest = parsed.data.destination.trim();
  const destIata = resolveFlightDestinationIata(dest);
  const summaryOnly =
    parsed.data.summary === '1' || parsed.data.summary === 'true';

  // Past departures are rejected upstream; fail fast with empty for calendar badges.
  {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (parsed.data.startDate < today) {
      if (summaryOnly) {
        return NextResponse.json({
          configured: true,
          summary: true,
          date: parsed.data.startDate,
          found: false,
          status: 'empty',
          cheapestPrice: null,
          minStops: null,
          minDurationMinutes: null,
          offerCount: 0,
          code: 'past_date',
        });
      }
      return NextResponse.json(
        {
          configured: true,
          found: false,
          count: 0,
          quote: null,
          offers: [],
          error: 'Scegli una data di partenza da oggi in poi.',
          code: 'past_date',
        },
        { status: 400 }
      );
    }
  }

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
    const { offers, destinationIata, originsSearched, originsFailed, allTimedOut } =
      await searchFlightRates({
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
    const allOriginsFailed =
      originsSearched.length > 0 &&
      originsFailed.length >= originsSearched.length &&
      offers.length === 0;

    if (allOriginsFailed) {
      const code = allTimedOut ? 'provider_timeout' : 'upstream_error';
      const error = allTimedOut
        ? `La ricerca voli da ${originsFailed.slice(0, 4).join(', ')} verso ${destinationIata} ha impiegato troppo. L’errore non è nascosto: riprova manualmente (un tentativo automatico è già stato fatto).`
        : `Ricerca voli non riuscita da ${originsFailed.slice(0, 4).join(', ')} verso ${destinationIata}. Riprova tra poco.`;
      if (summaryOnly) {
        return NextResponse.json(
          {
            configured: true,
            summary: true,
            date: parsed.data.startDate,
            found: false,
            status: 'error',
            cheapestPrice: null,
            minStops: null,
            minDurationMinutes: null,
            offerCount: 0,
            destinationIata,
            code,
            error,
          },
          { status: 502 }
        );
      }
      return NextResponse.json(
        {
          configured: true,
          found: false,
          count: 0,
          quote: null,
          offers: [],
          destinationIata,
          originsSearched,
          originsFailed,
          tripType: parsed.data.tripType,
          error,
          code,
        },
        { status: 502 }
      );
    }

    if (summaryOnly) {
      // Chip stats from ONE offer (cheapest) — never mix mins across flights.
      const chip = dayChipFromOffers(
        offers.map((o) => ({
          id: o.offerId,
          price: o.price,
          stops: o.stops,
          durationMinutes: o.durationMinutes ?? 0,
          airline: o.airline ?? null,
        }))
      );
      return NextResponse.json({
        configured: true,
        summary: true,
        date: parsed.data.startDate,
        found: Boolean(chip),
        status: chip ? 'ok' : 'empty',
        cheapestPrice: chip?.cheapestPrice ?? null,
        minStops: chip?.minStops ?? null,
        minDurationMinutes: chip?.minDurationMinutes ?? null,
        airline: chip?.airline ?? null,
        offerId: chip?.offerId ?? null,
        offerCount: offers.length,
        destinationIata,
        tripType: parsed.data.tripType,
      });
    }

    return NextResponse.json({
      configured: true,
      found: Boolean(cheapest),
      count: offers.length,
      quote: cheapest ?? null,
      offers: offers.slice(0, 30),
      destinationIata,
      originsSearched,
      originsFailed,
      tripType: parsed.data.tripType,
      message: cheapest
        ? undefined
        : originsSearched.length > 1
          ? `Nessun volo trovato da ${originsSearched.slice(0, 6).join(', ')}${originsSearched.length > 6 ? '…' : ''} verso ${destinationIata}. Prova altre date o un altro aeroporto di partenza.`
          : originsSearched.length === 1
            ? `Nessun volo trovato da ${originsSearched[0]} verso ${destinationIata}. Prova altre date o un altro aeroporto di partenza.`
            : `Origine non riconosciuta. Scegli un aeroporto (es. FCO).`,
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
