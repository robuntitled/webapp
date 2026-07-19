import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

const API_KEY =
  process.env.GOOGLE_MAPS_API_KEY?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
  '';

export type PlaceDetailsResult = {
  placeId: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  ratingCount: number | null;
  /** Resource name foto Google, es. places/xxx/photos/yyy */
  photoName: string | null;
  /** URL proxy app per mostrare la foto */
  photoUrl: string | null;
  primaryType: string | null;
  source: 'cache' | 'google';
};

function normalizePlaceId(placeId: string): string {
  const id = placeId.trim();
  if (id.startsWith('places/')) return id;
  return `places/${id}`;
}

function shortPlaceId(placeId: string): string {
  return placeId.replace(/^places\//, '');
}

/**
 * Dettagli luogo: cache DB → Place Details (New).
 * Include rating + resource foto (URL via /api/places/photo).
 */
export async function getPlaceDetails(placeIdInput: string): Promise<{
  ok: boolean;
  place?: PlaceDetailsResult;
  error?: string;
}> {
  if (!placeIdInput.trim()) {
    return { ok: false, error: 'placeId mancante' };
  }

  const placeId = normalizePlaceId(placeIdInput);
  const shortId = shortPlaceId(placeId);

  // ── Cache DB ────────────────────────────────────────────────────────────
  try {
    const { data } = await supabaseAdmin
      .from('places_details_cache')
      .select('*')
      .eq('place_id', shortId)
      .maybeSingle();

    if (data && data.name) {
      // Probabilistic counter — meno write su cache hit
      if (Math.random() < 0.1) {
        const prev =
          typeof data.hit_count === 'number' && Number.isFinite(data.hit_count)
            ? data.hit_count
            : 0;
        void supabaseAdmin
          .from('places_details_cache')
          .update({ hit_count: prev + 1 })
          .eq('place_id', shortId);
      }

      const photoName =
        typeof data.photo_name === 'string' && data.photo_name
          ? data.photo_name
          : null;

      return {
        ok: true,
        place: {
          placeId: shortId,
          name: data.name,
          address: data.address ?? '',
          lat: data.lat ?? null,
          lng: data.lng ?? null,
          rating: data.rating != null ? Number(data.rating) : null,
          ratingCount: data.rating_count ?? null,
          photoName,
          photoUrl: photoName
            ? `/api/places/photo?name=${encodeURIComponent(photoName)}&h=400`
            : null,
          primaryType: data.primary_type ?? null,
          source: 'cache',
        },
      };
    }
  } catch {
    // continue to Google
  }

  if (!API_KEY) {
    return { ok: false, error: 'API key Google mancante' };
  }

  // ── Place Details (New) ─────────────────────────────────────────────────
  try {
    const res = await fetch(`https://places.googleapis.com/v1/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask':
          'id,displayName,formattedAddress,location,rating,userRatingCount,photos,primaryType',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(6_000),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      rating?: number;
      userRatingCount?: number;
      photos?: Array<{ name?: string }>;
      primaryType?: string;
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.message || `Place Details HTTP ${res.status}`,
      };
    }

    const name = data.displayName?.text?.trim();
    if (!name) {
      return { ok: false, error: 'Luogo senza nome' };
    }

    const photoName = data.photos?.[0]?.name?.trim() || null;
    const lat = data.location?.latitude ?? null;
    const lng = data.location?.longitude ?? null;
    const rating = typeof data.rating === 'number' ? data.rating : null;
    const ratingCount =
      typeof data.userRatingCount === 'number' ? data.userRatingCount : null;
    const primaryType = data.primaryType ?? null;
    const address = data.formattedAddress ?? '';
    const id = shortPlaceId(data.id || shortId);

    // Salva cache per sempre (condivisa)
    void supabaseAdmin.from('places_details_cache').upsert(
      {
        place_id: id,
        name,
        address,
        lat,
        lng,
        rating,
        rating_count: ratingCount,
        photo_name: photoName,
        primary_type: primaryType,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'place_id' }
    );

    return {
      ok: true,
      place: {
        placeId: id,
        name,
        address,
        lat,
        lng,
        rating,
        ratingCount,
        photoName,
        photoUrl: photoName
          ? `/api/places/photo?name=${encodeURIComponent(photoName)}&h=400`
          : null,
        primaryType,
        source: 'google',
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Errore Place Details',
    };
  }
}

/**
 * Scarica bytes foto Places (New) media endpoint.
 */
export async function fetchPlacePhotoBytes(
  photoName: string,
  maxHeightPx = 400
): Promise<{ ok: boolean; bytes?: ArrayBuffer; contentType?: string; error?: string }> {
  if (!API_KEY) return { ok: false, error: 'API key mancante' };
  const name = photoName.startsWith('places/')
    ? photoName
    : photoName;

  try {
    const url = new URL(`https://places.googleapis.com/v1/${name}/media`);
    url.searchParams.set('maxHeightPx', String(Math.min(Math.max(maxHeightPx, 100), 1200)));
    url.searchParams.set('skipHttpRedirect', 'true');

    const res = await fetch(url.toString(), {
      headers: { 'X-Goog-Api-Key': API_KEY },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      // Fallback: redirect mode (binary)
      const url2 = new URL(`https://places.googleapis.com/v1/${name}/media`);
      url2.searchParams.set('maxHeightPx', String(Math.min(Math.max(maxHeightPx, 100), 1200)));
      url2.searchParams.set('key', API_KEY);
      const res2 = await fetch(url2.toString(), {
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
        redirect: 'follow',
      });
      if (!res2.ok) {
        return { ok: false, error: `Photo HTTP ${res.status}` };
      }
      const bytes = await res2.arrayBuffer();
      return {
        ok: true,
        bytes,
        contentType: res2.headers.get('content-type') || 'image/jpeg',
      };
    }

    const json = (await res.json().catch(() => null)) as { photoUri?: string } | null;
    if (json?.photoUri) {
      const img = await fetch(json.photoUri, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      });
      if (!img.ok) return { ok: false, error: 'photoUri fetch failed' };
      return {
        ok: true,
        bytes: await img.arrayBuffer(),
        contentType: img.headers.get('content-type') || 'image/jpeg',
      };
    }

    // Some responses return image directly even with skipHttpRedirect
    const ct = res.headers.get('content-type') || '';
    if (ct.startsWith('image/')) {
      return { ok: true, bytes: await res.arrayBuffer(), contentType: ct };
    }

    return { ok: false, error: 'Formato foto non riconosciuto' };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Errore foto',
    };
  }
}
