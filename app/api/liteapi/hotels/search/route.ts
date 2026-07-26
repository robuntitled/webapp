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
  refundableOnly: z
    .enum(['0', '1', 'true', 'false'])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  breakfast: z
    .enum(['0', '1', 'true', 'false'])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  minStars: z.coerce.number().int().min(0).max(5).optional(),
  pool: z
    .enum(['0', '1', 'true', 'false'])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
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
    refundableOnly: searchParams.get('refundableOnly') ?? undefined,
    breakfast: searchParams.get('breakfast') ?? undefined,
    minStars: searchParams.get('minStars') ?? undefined,
    pool: searchParams.get('pool') ?? undefined,
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
    let hotels = await searchHotelRates({
      cityName: parsed.data.cityName,
      countryCode: parsed.data.countryCode,
      checkin: parsed.data.checkin,
      checkout: parsed.data.checkout,
      adults: parsed.data.adults,
      currency: parsed.data.currency?.toUpperCase() ?? 'EUR',
      guestNationality: 'IT',
      refundableRatesOnly: parsed.data.refundableOnly || undefined,
      boardTypes: parsed.data.breakfast ? 'BB' : undefined,
      minStars: parsed.data.minStars && parsed.data.minStars > 0 ? parsed.data.minStars : undefined,
    });

    if (parsed.data.refundableOnly) {
      hotels = hotels.filter((h) => h.freeCancellation || h.refundable);
    }
    if (parsed.data.breakfast) {
      hotels = hotels.filter((h) => {
        const board = `${h.boardType ?? ''} ${h.boardName ?? ''}`.toLowerCase();
        return (
          board.includes('bb') ||
          board.includes('breakfast') ||
          board.includes('colazione') ||
          board.includes('bed')
        );
      });
    }
    if (parsed.data.minStars && parsed.data.minStars > 0) {
      hotels = hotels.filter((h) => (h.stars ?? 0) >= parsed.data.minStars!);
    }
    if (parsed.data.pool) {
      hotels = hotels.filter((h) =>
        h.facilities.some((f) => /pool|piscina|swim/i.test(f))
      );
    }

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
            ? 'Servizio hotel temporaneamente non disponibile. Verifica la chiave API (sandbox privata) e riprova dopo un redeploy.'
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
