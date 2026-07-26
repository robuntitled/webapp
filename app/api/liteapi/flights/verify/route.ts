import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { verifyFlightOffer } from '@/lib/liteapi/flight-booking';

const schema = z.object({
  offerId: z.string().trim().min(8).max(8000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Accedi per continuare.' }, { status: 401 });
  }
  if (!isLiteApiConfigured()) {
    return NextResponse.json(
      { error: 'Servizio voli non configurato.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'offerId non valido' }, { status: 400 });
  }

  try {
    const result = await verifyFlightOffer(parsed.data.offerId);
    return NextResponse.json({
      ok: true,
      offerId: result.offerId,
      price: result.price,
      currency: result.currency,
      expiration: result.expiration,
      priceChanged: result.priceChanged,
      previousPrice: result.previousPrice,
    });
  } catch (e) {
    if (e instanceof LiteApiError) {
      console.error('[flights/verify]', e.status, e.message, e.body);
      const expired = e.status === 404;
      return NextResponse.json(
        {
          error: expired
            ? 'Offerta scaduta. Torna ai risultati e cerca di nuovo.'
            : e.message,
          code: expired ? 'offer_expired' : 'verify_error',
        },
        { status: expired ? 404 : e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[flights/verify]', e);
    return NextResponse.json({ error: 'Errore verifica offerta.' }, { status: 500 });
  }
}
