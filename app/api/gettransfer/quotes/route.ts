import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPaidApi } from '@/lib/api/request-guard';
import {
  buildDateTo,
  fetchRouteInfo,
  GetTransferError,
  isGetTransferApiConfigured,
  isGetTransferSandbox,
  SANDBOX_NO_OFFERS_HINT,
} from '@/lib/gettransfer/client';
import { validatePickupDate } from '@/lib/gettransfer/pickup-window';
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
  fromCountry: z.string().trim().length(2).optional(),
  toCountry: z.string().trim().length(2).optional(),
});

type ResolvedPoint = {
  label: string;
  lat: number;
  lng: number;
  countryCode?: string;
};

async function resolvePoint(
  label: string,
  lat?: number,
  lng?: number,
  countryCode?: string
): Promise<ResolvedPoint> {
  const normalizedCountry = countryCode?.trim().toUpperCase();

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
    if (normalizedCountry) return { label, lat, lng, countryCode: normalizedCountry };
    // countries[] is required by the spec, so best-effort resolve it from the
    // label; a failure must not break a search that already has coordinates.
    const hit = await searchPlaces(label, 1).catch(() => []);
    return { label, lat, lng, countryCode: hit[0]?.countryCode };
  }

  const hits = await searchPlaces(label, 5);
  if (!hits.length) {
    throw new Error(`Impossibile geocodificare «${label}». Prova un indirizzo più specifico.`);
  }

  const best = hits[0];
  return {
    label: best.label,
    lat: best.lat,
    lng: best.lng,
    countryCode: normalizedCountry ?? best.countryCode,
  };
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
      resolvePoint(
        fromLabel,
        parsed.data.fromLat,
        parsed.data.fromLng,
        parsed.data.fromCountry
      ),
      resolvePoint(toLabel, parsed.data.toLat, parsed.data.toLng, parsed.data.toCountry),
    ]);

    const raw = await fetchRouteInfo({
      points: [
        { lat: from.lat, lng: from.lng, countryCode: from.countryCode },
        { lat: to.lat, lng: to.lng, countryCode: to.countryCode },
      ],
      pax,
      dateTo,
      currency: 'EUR',
      distanceUnit: 'km',
    });

    const { offers, distance, duration, success } = parseRouteInfoOffers(raw);
    const sandbox = isGetTransferSandbox();

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
      sandbox,
      hint: sandbox && offers.length === 0 ? SANDBOX_NO_OFFERS_HINT : undefined,
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
