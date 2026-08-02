import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { bookFlight } from '@/lib/liteapi/flight-booking';
import { grantCreditsAfterBook } from '@/lib/credits/grant-after-book';

const schema = z.object({
  prebookId: z.string().trim().min(4).max(200),
  transactionId: z.string().trim().min(4).max(200),
  bookingAmount: z.number().positive().max(1_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
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
    const { bookingAmount, currency, ...bookInput } = parsed.data;
    const result = await bookFlight(bookInput);

    let credits: Awaited<ReturnType<typeof grantCreditsAfterBook>>['public'] | null =
      null;
    try {
      const granted = await grantCreditsAfterBook({
        userId: session.user.id,
        bookingKind: 'flight',
        bookingId: result.bookingId,
        bookingRef: result.bookingRef,
        transactionId: bookInput.transactionId,
        fallbackAmountEuros: bookingAmount ?? null,
        fallbackCurrency: currency ?? null,
        raw: result.raw,
      });
      credits = granted.public;
    } catch (creditErr) {
      console.error('[flights/book] credits', creditErr);
    }

    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      bookingRef: result.bookingRef,
      status: result.status,
      credits,
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
