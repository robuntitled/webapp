import { NextResponse } from 'next/server';
import { guardPaidApi } from '@/lib/api/request-guard';
import { fetchPlacePhotoBytes } from '@/lib/places/google-place-details';

/**
 * Proxy foto Places (non espone la API key al browser).
 * Richiede sessione (cookie) — le <img> same-origin inviano la sessione.
 * Cache HTTP lunga: stessa foto → meno round-trip / meno Google.
 */
export async function GET(request: Request) {
  const gate = await guardPaidApi(request, 'places-photo', {
    perUser: 120,
    perIp: 150,
    windowMs: 60_000,
  });
  if ('error' in gate) return gate.error;

  const url = new URL(request.url);
  const name = url.searchParams.get('name')?.trim() ?? '';
  const h = Number(url.searchParams.get('h') ?? '400');

  if (!name || name.length < 8 || name.length > 500) {
    return NextResponse.json({ error: 'name non valido' }, { status: 400 });
  }

  // Path traversal / injection basilare
  if (name.includes('..') || !name.includes('photos')) {
    return NextResponse.json({ error: 'name non valido' }, { status: 400 });
  }

  const result = await fetchPlacePhotoBytes(name, Number.isFinite(h) ? h : 400);
  if (!result.ok || !result.bytes) {
    return NextResponse.json(
      { error: result.error ?? 'Foto non disponibile' },
      { status: 502 }
    );
  }

  return new NextResponse(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      'Content-Type': result.contentType || 'image/jpeg',
      // private: non condividere foto autenticata su CDN pubblici indiscriminati
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
