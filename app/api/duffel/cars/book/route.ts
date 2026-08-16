import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, guardPaidApi } from '@/lib/api/request-guard';
import { DuffelError } from '@/lib/duffel/client';
import { isDuffelConfigured } from '@/lib/duffel/config';
import { createCarBooking } from '@/lib/duffel/cars';
import { canBookWithoutCard, normalizePhoneE164 } from '@/lib/duffel/cars-map';

const schema = z.object({
  quoteId: z.string().trim().min(8).max(80),
  givenName: z.string().trim().min(1).max(80),
  familyName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(8).max(24),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentType: z.enum(['postpaid', 'guarantee', 'prepaid']).optional(),
  policyCount: z.coerce.number().int().min(0).max(20).optional().default(0),
  acceptedPolicies: z.array(z.string().trim().min(1)).optional().default([]),
});

function ageOnDate(dob: string, on = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  const birth = new Date(y, (m ?? 1) - 1, d ?? 1);
  let age = on.getFullYear() - birth.getFullYear();
  const md = on.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && on.getDate() < birth.getDate())) age -= 1;
  return age;
}

export async function POST(request: Request) {
  const gate = await guardPaidApi(request, 'duffel-cars-book', {
    perUser: 8,
    perIp: 16,
    windowMs: 60_000,
  });
  if ('error' in gate) return gate.error;

  if (!isDuffelConfigured()) {
    return NextResponse.json(
      { error: 'API Duffel non configurata.', code: 'missing_token', configured: false },
      { status: 503 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati conducente non validi' }, { status: 400 });
  }

  const phone = normalizePhoneE164(parsed.data.phone);
  if (!phone) {
    return NextResponse.json(
      { error: 'Telefono non valido. Usa il formato internazionale, es. +393471234567.' },
      { status: 400 }
    );
  }

  const age = ageOnDate(parsed.data.dateOfBirth);
  if (age < 18 || age > 99) {
    return NextResponse.json(
      { error: 'Il conducente deve avere almeno 18 anni.' },
      { status: 400 }
    );
  }

  if (parsed.data.paymentType && !canBookWithoutCard(parsed.data.paymentType)) {
    return NextResponse.json(
      {
        error:
          'Questa tariffa richiede una carta (pagamento o garanzia). Per ora prenota solo “Paga al ritiro”.',
        code: 'card_required',
      },
      { status: 422 }
    );
  }

  if (
    parsed.data.policyCount > 0 &&
    parsed.data.acceptedPolicies.length < parsed.data.policyCount
  ) {
    return NextResponse.json(
      { error: 'Accetta tutte le informative privacy del noleggiatore.' },
      { status: 400 }
    );
  }

  try {
    const booking = await createCarBooking(
      {
        quoteId: parsed.data.quoteId,
        driver: {
          given_name: parsed.data.givenName,
          family_name: parsed.data.familyName,
          email: parsed.data.email,
          phone_number: phone,
          date_of_birth: parsed.data.dateOfBirth,
        },
        metadata: {
          user_id: gate.userId,
          source: 'prenota_auto',
        },
      },
      {
        deviceIp: clientIp(request),
        deviceUserAgent: request.headers.get('user-agent') ?? undefined,
      }
    );

    if (!canBookWithoutCard(booking.payment_type) && booking.payment_type) {
      // Should not happen: we refuse card rates client-side, but log if supplier flipped.
      console.warn('[duffel cars book] unexpected payment_type', booking.payment_type);
    }

    return NextResponse.json({
      configured: true,
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        confirmedAt: booking.confirmed_at,
        paymentType: booking.payment_type,
        totalAmount: booking.total_amount,
        totalCurrency: booking.total_currency,
        carName: booking.car?.name,
        supplierName: booking.supplier?.name,
        pickupDate: booking.pickup_date,
        pickupTime: booking.pickup_time,
        dropoffDate: booking.dropoff_date,
        dropoffTime: booking.dropoff_time,
      },
    });
  } catch (e) {
    if (e instanceof DuffelError) {
      console.error('[duffel cars book]', e.status, e.message, e.code, e.body);
      if (e.code === 'high_fraud_risk') {
        return NextResponse.json(
          { error: 'Prenotazione rifiutata per controllo frodi.', code: e.code },
          { status: 422 }
        );
      }
      if (e.status === 422) {
        return NextResponse.json(
          {
            error:
              'Questa tariffa richiede una carta (pagamento o garanzia). Per l’MVP prenota solo “Paga al ritiro”.',
            code: 'card_required',
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: 'Prenotazione non riuscita. Riprova o scegli un’altra auto.' },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[duffel cars book]', e);
    return NextResponse.json({ error: 'Errore prenotazione auto.' }, { status: 500 });
  }
}
