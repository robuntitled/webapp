import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import {
  getLiteApiPaymentEnv,
  getLiteApiStripePublishableKey,
  isLiteApiConfigured,
} from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { prebookHotel } from '@/lib/liteapi/hotel-booking';

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
      { error: 'Servizio hotel non configurato.' },
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
    const result = await prebookHotel(parsed.data.offerId);
    const publishableKey =
      result.publishableKey ?? getLiteApiStripePublishableKey();
    return NextResponse.json({
      ok: true,
      prebookId: result.prebookId,
      transactionId: result.transactionId,
      secretKey: result.secretKey,
      publishableKey,
      paymentEnv: getLiteApiPaymentEnv(),
      paymentMode: publishableKey ? 'stripe_elements' : 'liteapi_sdk',
      price: result.price,
      currency: result.currency,
    });
  } catch (e) {
    if (e instanceof LiteApiError) {
      console.error('[hotels/prebook]', e.status, e.message, e.body);
      const expired = e.status === 404 || e.status === 408;
      return NextResponse.json(
        {
          error: expired
            ? 'Offerta scaduta. Torna alla ricerca e riprova.'
            : e.message,
          code: expired ? 'offer_expired' : 'prebook_error',
        },
        {
          status: expired
            ? 404
            : e.status >= 400 && e.status < 600
              ? e.status
              : 502,
        }
      );
    }
    console.error('[hotels/prebook]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Errore prebook hotel.' },
      { status: 500 }
    );
  }
}
