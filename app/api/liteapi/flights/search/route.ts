import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { searchFlightRates } from '@/lib/liteapi/flights';

const schema = z.object({
  destination: z.string().trim().min(2).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  originIata: z
    .string()
    .trim()
    .length(3)
    .transform((s) => s.toUpperCase())
    .optional(),
  adults: z.coerce.number().int().min(1).max(9).optional(),
  currency: z.string().trim().length(3).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Accedi a NomadLink per cercare voli.', code: 'auth_required' },
      { status: 401 }
    );
  }

  if (!isLiteApiConfigured()) {
    return NextResponse.json(
      {
        error: 'LITEAPI_KEY assente. Aggiungi la chiave Nuitee Connect e fai Redeploy.',
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
    adults: searchParams.get('adults') ?? undefined,
    currency: searchParams.get('currency') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parametri non validi', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const offers = await searchFlightRates({
      destination: parsed.data.destination,
      departureDate: parsed.data.startDate,
      returnDate: parsed.data.endDate,
      originIata: parsed.data.originIata,
      adults: parsed.data.adults,
      currency: parsed.data.currency?.toUpperCase() ?? 'EUR',
    });

    const cheapest = offers[0] ?? null;

    return NextResponse.json({
      configured: true,
      provider: 'liteapi',
      found: Boolean(cheapest),
      count: offers.length,
      quote: cheapest
        ? {
            price: cheapest.price,
            currency: cheapest.currency,
            airline: cheapest.airline,
            origin: cheapest.origin,
            destination: cheapest.destination,
            offerId: cheapest.offerId,
          }
        : null,
      offers: offers.slice(0, 12),
      message: cheapest
        ? undefined
        : 'Nessuna tariffa trovata. In sandbox prova ROM→LHR o FCO→JFK con date future; chiedi a Nuitee l’abilitazione Flights + provider “Nuitee Air”.',
      debug: {
        destination: parsed.data.destination,
        originIata: parsed.data.originIata ?? null,
      },
    });
  } catch (e) {
    if (e instanceof LiteApiError) {
      console.error('[liteapi flights]', e.status, e.message, e.body);
      const isAuth = e.status === 401 || /unauthor/i.test(e.message);
      const bodyMsg =
        typeof e.body === 'object' && e.body && 'error' in e.body
          ? JSON.stringify((e.body as { error?: unknown }).error).slice(0, 280)
          : '';
      return NextResponse.json(
        {
          error: isAuth
            ? 'LiteAPI rifiuta la chiave. Usa Sandbox/Production Key con prodotto Flights abilitato.'
            : bodyMsg || e.message,
          configured: true,
          code: isAuth ? 'liteapi_unauthorized' : 'liteapi_error',
          liteapiStatus: e.status,
        },
        { status: isAuth ? 502 : e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[liteapi flights]', e);
    return NextResponse.json({ error: 'Errore ricerca voli.' }, { status: 500 });
  }
}
