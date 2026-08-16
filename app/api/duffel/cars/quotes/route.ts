import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPaidApi } from '@/lib/api/request-guard';
import { DuffelError } from '@/lib/duffel/client';
import { isDuffelConfigured } from '@/lib/duffel/config';
import { createCarQuote } from '@/lib/duffel/cars';
import {
  canBookWithoutCard,
  formatMoneyAmount,
  locationLabel,
  mapCarRate,
  paymentTypeLabel,
  type DuffelPaymentType,
} from '@/lib/duffel/cars-map';

const schema = z.object({
  rateId: z.string().trim().min(8).max(80),
});

export async function POST(request: Request) {
  const gate = await guardPaidApi(request, 'duffel-cars-quote', {
    perUser: 20,
    perIp: 40,
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
    return NextResponse.json({ error: 'Tariffa non valida' }, { status: 400 });
  }

  try {
    const quote = await createCarQuote(parsed.data.rateId);
    const paymentType = (quote.payment_type ?? 'postpaid') as DuffelPaymentType;
    const mapped = mapCarRate({
      id: quote.rate_id || quote.id,
      payment_type: paymentType,
      total_amount: quote.total_amount,
      total_currency: quote.total_currency,
      base_amount: quote.base_amount,
      base_currency: quote.base_currency,
      car: quote.car,
      supplier: quote.supplier,
      pickup_location: quote.pickup_location,
      dropoff_location: quote.dropoff_location,
    });

    const total = Number.parseFloat(quote.total_amount || quote.base_amount || '0');
    const currency = (quote.total_currency || quote.base_currency || 'EUR').toUpperCase();

    return NextResponse.json({
      configured: true,
      quote: {
        id: quote.id,
        rateId: quote.rate_id,
        searchId: quote.search_id,
        paymentType,
        paymentLabel: paymentTypeLabel(
          paymentType === 'prepaid' || paymentType === 'guarantee' ? paymentType : 'postpaid'
        ),
        bookableWithoutCard: canBookWithoutCard(paymentType),
        priceLabel: formatMoneyAmount(Number.isFinite(total) ? total : 0, currency),
        totalAmount: Number.isFinite(total) ? total : 0,
        totalCurrency: currency,
        car: mapped,
        pickupName: locationLabel(quote.pickup_location),
        dropoffName: locationLabel(quote.dropoff_location),
        pickupDate: quote.pickup_date,
        pickupTime: quote.pickup_time,
        dropoffDate: quote.dropoff_date,
        dropoffTime: quote.dropoff_time,
        conditions: (quote.conditions ?? []).map((c) => ({
          title: c.title ?? 'Condizione',
          text: c.text ?? '',
        })),
        charges: (quote.charges ?? []).map((c) => ({
          amount: c.amount,
          currency: c.currency,
          description: c.description,
        })),
        privacyPolicies: (quote.privacy_policies ?? []).map((p) => ({
          title: p.title ?? 'Privacy',
          text: p.text ?? '',
        })),
      },
    });
  } catch (e) {
    if (e instanceof DuffelError) {
      console.error('[duffel cars quote]', e.status, e.message, e.body);
      return NextResponse.json(
        { error: 'Impossibile confermare il prezzo. Riprova o scegli un’altra auto.' },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }
    console.error('[duffel cars quote]', e);
    return NextResponse.json({ error: 'Errore preventivo auto.' }, { status: 500 });
  }
}
