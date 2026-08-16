import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guardPaidApi } from '@/lib/api/request-guard';
import { DuffelError } from '@/lib/duffel/client';
import { isDuffelConfigured, isDuffelTestMode } from '@/lib/duffel/config';
import { searchCars } from '@/lib/duffel/cars';
import { mapCarRates } from '@/lib/duffel/cars-map';
import { searchPlaces } from '@/lib/places/nominatim';

const schema = z.object({
  pickupLabel: z.string().trim().min(2).max(200),
  dropoffLabel: z.string().trim().min(2).max(200).optional(),
  pickupLat: z.coerce.number().finite().optional(),
  pickupLng: z.coerce.number().finite().optional(),
  dropoffLat: z.coerce.number().finite().optional(),
  dropoffLng: z.coerce.number().finite().optional(),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  dropoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dropoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  driverAge: z.coerce.number().int().min(18).max(99).optional().default(30),
  residenceCountryCode: z
    .string()
    .trim()
    .length(2)
    .optional()
    .default('IT'),
});

type ResolvedPoint = { label: string; lat: number; lng: number };

function validCoords(lat?: number, lng?: number): boolean {
  return (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

async function resolvePoint(
  label: string,
  lat?: number,
  lng?: number
): Promise<ResolvedPoint> {
  if (validCoords(lat, lng)) {
    return { label, lat: lat as number, lng: lng as number };
  }
  const hits = await searchPlaces(label, 5);
  if (!hits.length) {
    throw new Error(`Impossibile geocodificare «${label}». Prova città o aeroporto.`);
  }
  const best = hits[0];
  return { label: best.label, lat: best.lat, lng: best.lng };
}

function duffelUnavailable(e: DuffelError): boolean {
  if (e.status === 401 || e.status === 403) return true;
  return /cars/i.test(e.message) && /not (enabled|available|author)/i.test(e.message);
}

export async function POST(request: Request) {
  const gate = await guardPaidApi(request, 'duffel-cars-search', {
    perUser: 12,
    perIp: 24,
    windowMs: 60_000,
  });
  if ('error' in gate) return gate.error;

  if (!isDuffelConfigured()) {
    return NextResponse.json(
      {
        error:
          'API Duffel non configurata. Crea un token su https://app.duffel.com e imposta DUFFEL_ACCESS_TOKEN. Per le auto: Dashboard → Request access to Duffel Cars.',
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

  const {
    pickupLabel,
    pickupDate,
    pickupTime,
    dropoffDate,
    dropoffTime,
    driverAge,
    residenceCountryCode,
  } = parsed.data;
  const dropoffLabel = parsed.data.dropoffLabel?.trim() || pickupLabel;

  const pickupTs = new Date(`${pickupDate}T${pickupTime}:00`).getTime();
  const dropoffTs = new Date(`${dropoffDate}T${dropoffTime}:00`).getTime();
  if (Number.isNaN(pickupTs) || Number.isNaN(dropoffTs)) {
    return NextResponse.json({ error: 'Date non valide' }, { status: 400 });
  }
  if (pickupTs < Date.now() + 2 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: 'Il ritiro deve essere almeno 2 ore nel futuro.' },
      { status: 400 }
    );
  }
  if (dropoffTs < pickupTs + 2 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: 'La restituzione deve essere almeno 2 ore dopo il ritiro.' },
      { status: 400 }
    );
  }

  try {
    const [pickup, dropoff] = await Promise.all([
      resolvePoint(pickupLabel, parsed.data.pickupLat, parsed.data.pickupLng),
      resolvePoint(dropoffLabel, parsed.data.dropoffLat, parsed.data.dropoffLng),
    ]);

    const search = await searchCars({
      pickupDate,
      pickupTime,
      dropoffDate,
      dropoffTime,
      pickup: { lat: pickup.lat, lng: pickup.lng },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng },
      driverAge,
      residenceCountryCode,
    });

    const rates = mapCarRates(search.rates);
    const testMode = isDuffelTestMode() || search.live_mode === false;

    return NextResponse.json({
      configured: true,
      testMode,
      searchId: search.id,
      pickup,
      dropoff,
      count: rates.length,
      rates,
      hint:
        testMode && rates.length === 0
          ? 'Token di test: Duffel Cars sandbox spesso risponde su Londra (LHR) o altre città UK. In live serve “Request access to Cars”.'
          : undefined,
    });
  } catch (e) {
    if (e instanceof DuffelError) {
      console.error('[duffel cars search]', e.status, e.message, e.code, e.body);
      if (e.status === 503 && e.code === 'missing_token') {
        return NextResponse.json(
          { error: e.message, code: 'missing_token', configured: false },
          { status: 503 }
        );
      }
      if (duffelUnavailable(e)) {
        return NextResponse.json(
          {
            error:
              'Duffel Cars non è ancora attivo su questo account. In dashboard Duffel: More → Developers, crea un test token e richiedi accesso a Cars.',
            code: 'cars_not_enabled',
            configured: true,
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Ricerca auto temporaneamente non disponibile.', configured: true },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 }
      );
    }

    const message = e instanceof Error ? e.message : 'Errore ricerca auto.';
    const isGeocode = message.includes('geocodificare');
    console.error('[duffel cars search]', e);
    return NextResponse.json({ error: message }, { status: isGeocode ? 400 : 500 });
  }
}
