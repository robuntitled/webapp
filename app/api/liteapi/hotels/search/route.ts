import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { searchHotelRates } from '@/lib/liteapi/hotels';

const schema = z.object({
  cityName: z.string().trim().min(2).max(80),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((s) => s.toUpperCase()),
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(9).optional(),
  currency: z.string().trim().length(3).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Accedi a NomadLink per cercare hotel.', code: 'auth_required' },
      { status: 401 }
    );
  }

  if (!isLiteApiConfigured()) {
    return NextResponse.json(
      {
        error:
          'LITEAPI_KEY assente su Vercel. Aggiungi la Sandbox Key (Private) e fai Redeploy.',
        configured: false,
        code: 'missing_key',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = schema.safeParse({
    cityName: searchParams.get('cityName'),
    countryCode: searchParams.get('countryCode'),
    checkin: searchParams.get('checkin'),
    checkout: searchParams.get('checkout'),
    adults: searchParams.get('adults') ?? undefined,
    currency: searchParams.get('currency') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parametri non validi', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { checkin, checkout } = parsed.data;
  if (new Date(checkout) <= new Date(checkin)) {
    return NextResponse.json(
      { error: 'Il check-out deve essere dopo il check-in.' },
      { status: 400 }
    );
  }

  try {
    const hotels = await searchHotelRates({
      ...parsed.data,
      currency: parsed.data.currency?.toUpperCase() ?? 'EUR',
      guestNationality: 'IT',
    });

    return NextResponse.json({
      configured: true,
      provider: 'liteapi',
      count: hotels.length,
      hotels,
    });
  } catch (e) {
    if (e instanceof LiteApiError) {
      console.error('[liteapi hotels]', e.status, e.message, e.body);
      const isAuth = e.status === 401 || /unauthor/i.test(e.message);
      return NextResponse.json(
        {
          error: isAuth
            ? 'LiteAPI rifiuta la chiave (unauthorized). Su Vercel usa la Sandbox Key PRIVATA (non Public Key, non Production). Poi Redeploy.'
            : e.message,
          configured: true,
          code: isAuth ? 'liteapi_unauthorized' : 'liteapi_error',
        },
        { status: isAuth ? 502 : e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[liteapi hotels]', e);
    return NextResponse.json({ error: 'Errore ricerca hotel.' }, { status: 500 });
  }
}
