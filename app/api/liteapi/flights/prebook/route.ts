import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { prebookFlight } from '@/lib/liteapi/flight-booking';

const passengerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['M', 'F']),
  nationality: z.string().trim().length(2),
  documentType: z.string().trim().min(2).max(40),
  documentNumber: z.string().trim().min(3).max(40),
  documentIssueCountry: z.string().trim().length(2),
  documentExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const schema = z.object({
  offerId: z.string().trim().min(8).max(8000),
  contact: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(160),
    phoneCountryCode: z.string().trim().min(1).max(4),
    phoneNumber: z.string().trim().min(6).max(20),
  }),
  passengers: z.array(passengerSchema).min(1).max(9),
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
    return NextResponse.json(
      { error: 'Dati passeggero non validi', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await prebookFlight(parsed.data);
    return NextResponse.json({
      ok: true,
      prebookId: result.prebookId,
      transactionId: result.transactionId,
      secretKey: result.secretKey,
      publishableKey: result.publishableKey,
      price: result.price,
      currency: result.currency,
    });
  } catch (e) {
    if (e instanceof LiteApiError) {
      console.error('[flights/prebook]', e.status, e.message, e.body);
      const expired = e.status === 404;
      return NextResponse.json(
        {
          error: expired
            ? 'Offerta scaduta. Torna ai risultati e cerca di nuovo.'
            : e.message,
          code: expired ? 'offer_expired' : 'prebook_error',
        },
        { status: expired ? 404 : e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[flights/prebook]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Errore prebook.' },
      { status: 500 }
    );
  }
}
