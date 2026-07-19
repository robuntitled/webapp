import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

function headerCity(request: Request): string | null {
  const raw = request.headers.get('x-vercel-ip-city');
  if (!raw?.trim()) return null;
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

/**
 * Città approssimativa da edge geo di Vercel (fallback quando GPS non è disponibile).
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const city = headerCity(request);
  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase() ?? null;
  const latRaw = request.headers.get('x-vercel-ip-latitude');
  const lngRaw = request.headers.get('x-vercel-ip-longitude');
  const lat = latRaw != null ? Number(latRaw) : null;
  const lng = lngRaw != null ? Number(lngRaw) : null;

  if (!city && (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng))) {
    return NextResponse.json({ error: 'Geo non disponibile' }, { status: 404 });
  }

  return NextResponse.json({
    city: city || null,
    country,
    lat: lat != null && Number.isFinite(lat) ? lat : null,
    lng: lng != null && Number.isFinite(lng) ? lng : null,
    source: 'vercel-edge',
  });
}
