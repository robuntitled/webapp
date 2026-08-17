import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { bookFlight } from '@/lib/liteapi/flight-booking';
import { recordBookingCashback } from '@/lib/commerce/cashback-ledger';

const schema = z.object({
  prebookId: z.string().trim().min(4).max(200),
  transactionId: z.string().trim().min(4).max(200),
  tripId: z.string().uuid().optional(),
  amountEur: z.number().finite().nonnegative().max(1_000_000).optional(),
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
    return NextResponse.json({ error: 'Parametri booking non validi' }, { status: 400 });
  }

  try {
    const result = await bookFlight(parsed.data);
    await recordBookingCashback({
      userId: session.user.id,
      tripId: parsed.data.tripId,
      bookingRef: result.bookingRef ?? result.bookingId ?? parsed.data.prebookId,
      service: 'flight',
      amountEur: parsed.data.amountEur ?? 0,
    });
    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      bookingRef: result.bookingRef,
      status: result.status,
    });
  } catch (e) {
    if (e instanceof LiteApiError) {
      console.error('[flights/book]', e.status, e.message, e.body);
      return NextResponse.json(
        {
          error:
            e.status === 409
              ? 'Prenotazione già in corso o in conflitto. Controlla le email o riprova dalla ricerca.'
              : e.message,
          code: e.status === 409 ? 'conflict' : 'book_error',
        },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[flights/book]', e);
    return NextResponse.json({ error: 'Errore conferma prenotazione.' }, { status: 500 });
  }
}
