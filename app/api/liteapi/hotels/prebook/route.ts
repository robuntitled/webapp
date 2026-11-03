import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { getLiteApiPaymentEnv, isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { prebookHotel } from '@/lib/liteapi/hotel-booking';
import { checkHotelEligibility } from '@/lib/data/hotel-eligibility';
import { storePrebookQuote } from '@/lib/liteapi/prebook-store';

const schema = z.object({
  offerId: z.string().trim().min(8).max(8000),
  practiceId: z.string().uuid().optional(),
  tripId: z.string().uuid().optional(),
});

function providerErrorMessage(status: number): string {
  if (status === 404 || status === 408) {
    return 'Questa offerta non è più disponibile. Torna alla ricerca.';
  }
  return 'Il fornitore non ha risposto. Riprova tra poco.';
}

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

  const eligibility = await checkHotelEligibility({
    userId: session.user.id,
    practiceId: parsed.data.practiceId,
    tripId: parsed.data.tripId,
  });
  if (!eligibility.ok) {
    return NextResponse.json(
      { error: eligibility.message, code: 'hotel_not_eligible' },
      { status: 403 }
    );
  }

  try {
    const result = await prebookHotel(parsed.data.offerId);
    await storePrebookQuote('hotel', result.prebookId, {
      userId: session.user.id,
      kind: 'hotel',
      offerId: parsed.data.offerId,
      price: result.price,
      currency: result.currency,
      createdAt: new Date().toISOString(),
    });
    const env = getLiteApiPaymentEnv();
    return NextResponse.json({
      ok: true,
      prebookId: result.prebookId,
      transactionId: result.transactionId,
      secretKey: result.secretKey,
      publishableKey: result.publishableKey,
      paymentEnv: env,
      paymentMode: 'liteapi_sdk',
      price: result.price,
      currency: result.currency,
    });
  } catch (e) {
    if (e instanceof LiteApiError) {
      const ref = `H-PB-${Date.now().toString(36).slice(-6)}`;
      console.error('[hotels/prebook]', ref, e.status, e.message, e.body);
      const expired = e.status === 404 || e.status === 408;
      return NextResponse.json(
        {
          error: providerErrorMessage(e.status),
          code: expired ? 'offer_expired' : 'prebook_error',
          ref,
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
    const ref = `H-PB-${Date.now().toString(36).slice(-6)}`;
    console.error('[hotels/prebook]', ref, e);
    return NextResponse.json(
      { error: 'Il fornitore non ha risposto. Riprova tra poco.', ref },
      { status: 500 }
    );
  }
}
