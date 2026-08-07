'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { reverseGeocode } from '@/lib/places/nominatim';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type CommunityLocationResult =
  | { ok: true; label: string | null }
  | { ok: false; error: string };

/** ~1 km — privacy a livello città/quartiere. */
function coarseCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

const shareSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function shareMyMapLocation(input: {
  lat: number;
  lng: number;
}): Promise<CommunityLocationResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Accedi per condividere la posizione.' };

  const parsed = shareSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Coordinate non valide.' };
  }

  const lat = coarseCoord(parsed.data.lat);
  const lng = coarseCoord(parsed.data.lng);

  let label: string | null = null;
  try {
    const place = await reverseGeocode(lat, lng);
    label = place
      ? [place.label, place.country].filter(Boolean).join(', ')
      : null;
    if (label && label.length > 120) label = label.slice(0, 120);
  } catch (e) {
    console.warn('[shareMyMapLocation] reverse failed', e);
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      map_lat: lat,
      map_lng: lng,
      map_label: label,
      map_visible: true,
      map_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[shareMyMapLocation]', error.message);
    return {
      ok: false,
      error:
        error.message.includes('map_lat') || error.message.includes('column')
          ? 'Mappa non ancora attiva sul database. Riprova tra poco.'
          : 'Impossibile salvare la posizione.',
    };
  }

  revalidatePath('/dashboard/bacheca');
  return { ok: true, label };
}

export async function hideMyMapLocation(): Promise<CommunityLocationResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Non autenticato.' };

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      map_visible: false,
      map_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[hideMyMapLocation]', error.message);
    return { ok: false, error: 'Impossibile nascondere la posizione.' };
  }

  revalidatePath('/dashboard/bacheca');
  return { ok: true, label: null };
}
