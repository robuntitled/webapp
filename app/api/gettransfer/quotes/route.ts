import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPaidApi } from '@/lib/api/request-guard';
import {
  fetchRouteInfo,
  GetTransferError,
  isGetTransferApiConfigured,
} from '@/lib/gettransfer/client';
import { parseRouteInfoOffers } from '@/lib/gettransfer/route-info';
import { searchPlaces } from '@/lib/places/nominatim';

const schema = z.object({
  fromLabel: z.string().trim().min(2).max(200),
  toLabel: z.string().trim().min(2).max(200),
  fromLat: z.coerce.number().finite().optional(),
  fromLng: z.coerce.number().finite().optional(),
  toLat: z.coerce.number().finite().optional(),
  toLng: z.coerce.number().finite().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional()
    .default('10:00'),
  pax: z.coerce.number().int().min(1).max(20).optional().default(2),
});

const MIN_HOURS_AHEAD = 6;

async function resolvePoint(
  label: string,
  lat?: number,
  lng?: number
): Promise<{ label: string; lat: number; lng: number }> {
  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    return { label, lat, lng };
  }

  const hits = await searchPlaces(label, 5);
  if (!hits.length) {
    throw new Error(`Impossibile geocodificare «${label}». Prova un indirizzo più specifico.`);
  }

  const best = hits[0];
  return { label: best.label, lat: best.lat, lng: best.lng };
}

function buildDateTo(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function validatePickupDate(dateTo: string): string | null {
  const pickup = new Date(dateTo);
  if (Number.isNaN(pickup.getTime())) {
    return 'Data o ora non valida.';
  }
  const min = Date.now() + MIN_HOURS_AHEAD * 60 * 60 * 1000;
  if (pickup.getTime() < min) {
    return `Il transfer deve essere almeno ${MIN_HOURS_AHEAD} ore nel futuro.`;
  }
  return null;
}

export async function POST(request: Request) {
  const gate = await guardPaidApi(request, 'gettransfer-quotes', {
    perUser: 20,
    perIp: 40,
    windowMs: 60_000,
  });
  if ('error' in gate) return gate.error;

  if (!isGetTransferApiConfigured()) {
    return NextResponse.json(
      {
        error:
          'API GetTransfer non configurata. Richiedi il token X-ACCESS-TOKEN a support@travelpayouts.com e imposta GETTRANSFER_ACCESS_TOKEN.',
        code: 'missing_token',
        configured: false,
      },
      { status: 503 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  const { fromLabel, toLabel, date, time, pax } = parsed.data;
  if (fromLabel.toLowerCase() === toLabel.toLowerCase()) {
    return NextResponse.json(
      { error: 'Partenza e destinazione devono essere diverse.' },
      { status: 400 }
    );
  }

  const dateTo = buildDateTo(date, time);
  const dateError = validatePickupDate(dateTo);
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
  }

  try {
    const [from, to] = await Promise.all([
      resolvePoint(fromLabel, parsed.data.fromLat, parsed.data.fromLng),
      resolvePoint(toLabel, parsed.data.toLat, parsed.data.toLng),
    ]);

    const raw = await fetchRouteInfo({
      points: [
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng },
      ],
      pax,
      dateTo,
      currency: 'EUR',
      distanceUnit: 'km',
    });

    const { offers, distance, duration, success } = parseRouteInfoOffers(raw);

    return NextResponse.json({
      configured: true,
      from,
      to,
      dateTo,
      pax,
      offers,
      distance,
      duration,
      success,
    });
  } catch (e) {
    if (e instanceof GetTransferError) {
      console.error('[gettransfer quotes]', e.status, e.message, e.body);
      if (e.status === 429) {
        return NextResponse.json({ error: e.message }, { status: 429 });
      }
      return NextResponse.json(
        { error: 'Servizio transfer temporaneamente non disponibile.', configured: true },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }

    const message = e instanceof Error ? e.message : 'Errore ricerca transfer.';
    const isGeocode = message.includes('geocodificare');
    console.error('[gettransfer quotes]', e);
    return NextResponse.json(
      { error: message },
      { status: isGeocode ? 400 : 500 }
    );
  }
}
