import { NextResponse } from 'next/server';
import { fetchPlacePhotoBytes } from '@/lib/places/google-place-details';

/**
 * Proxy foto Places (non espone la API key al browser).
 * Cache HTTP lunga: stessa foto → meno round-trip.
 */
export async function GET(request: Request) {
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

  return new NextResponse(result.bytes, {
    status: 200,
    headers: {
      'Content-Type': result.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  });
}
