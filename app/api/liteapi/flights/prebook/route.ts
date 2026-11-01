import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { getLiteApiPaymentEnv, isLiteApiConfigured } from '@/lib/liteapi/config';
import { LiteApiError } from '@/lib/liteapi/client';
import { prebookFlight } from '@/lib/liteapi/flight-booking';
import { storePrebookQuote } from '@/lib/liteapi/prebook-store';

const passengerSchema = z.object({
  title: z.enum(['MR', 'MRS', 'MS', 'MISS']),
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
    await storePrebookQuote('flight', result.prebookId, {
      userId: session.user.id,
      kind: 'flight',
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
      const ref = `F-PB-${Date.now().toString(36).slice(-6)}`;
      console.error('[flights/prebook]', ref, e.status, e.message, e.body);
      const expired = e.status === 404;
      return NextResponse.json(
        {
          error: expired
            ? 'Questa offerta non è più disponibile. Torna alla ricerca.'
            : 'Il fornitore non ha risposto. Riprova tra poco.',
          code: expired ? 'offer_expired' : 'prebook_error',
          ref,
        },
        { status: expired ? 404 : e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    const ref = `F-PB-${Date.now().toString(36).slice(-6)}`;
    console.error('[flights/prebook]', ref, e);
    return NextResponse.json(
      { error: 'Il fornitore non ha risposto. Riprova tra poco.', ref },
      { status: 500 }
    );
  }
}
