import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { bookHotel } from '@/lib/liteapi/hotel-booking';

const schema = z.object({
  prebookId: z.string().trim().min(4).max(200),
  transactionId: z.string().trim().min(4).max(200),
  holder: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(160),
  }),
  guests: z
    .array(
      z.object({
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().min(1).max(80),
        email: z.string().trim().email().max(160),
        occupancyNumber: z.number().int().min(1).max(9).optional(),
      })
    )
    .min(1)
    .max(9),
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
    return NextResponse.json(
      { error: 'Dati prenotazione non validi', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await bookHotel(parsed.data);
    return NextResponse.json({
      ok: true,
      bookingId: result.bookingId,
      bookingRef: result.bookingRef,
      status: result.status,
    });
  } catch (e) {
    if (e instanceof LiteApiError) {
      console.error('[hotels/book]', e.status, e.message, e.body);
      return NextResponse.json(
        {
          error:
            e.status === 409
              ? 'Prenotazione già in corso o in conflitto. Controlla l’email o riprova.'
              : e.message,
          code: e.status === 409 ? 'conflict' : 'book_error',
        },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[hotels/book]', e);
    return NextResponse.json(
      { error: 'Errore conferma prenotazione hotel.' },
      { status: 500 }
    );
  }
}
