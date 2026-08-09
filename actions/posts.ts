'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { profilePath } from '@/lib/profile/paths';
import { moderatePostContent } from '@/lib/moderation/moderate-post';
import { reverseGeocode } from '@/lib/places/nominatim';

export type PostActionResult =
  | { ok: true; postId?: string }
  | { ok: false; error: string };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/** ~1 km — privacy a livello città/quartiere. */
function coarseCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseOptionalCoord(raw: FormDataEntryValue | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function revalidateSocial(username?: string | null, userId?: string) {
  revalidatePath('/dashboard/bacheca');
  revalidatePath('/dashboard');
  const path = profilePath(username, userId);
  if (path) revalidatePath(path);
}

async function getUsername(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('username')
    .eq('id', userId)
    .maybeSingle();
  return (data?.username as string | null) ?? null;
}

export async function createPost(formData: FormData): Promise<PostActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Accedi per pubblicare.' };

  const bodyRaw = String(formData.get('body') ?? '').trim();
  if (bodyRaw.length > 2000) {
    return { ok: false, error: 'Il testo può avere al massimo 2000 caratteri.' };
  }

  const file = formData.get('image');
  let imageFile: File | null = null;
  let imageBuffer: Buffer | null = null;

  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return { ok: false, error: 'Formato immagine non supportato (jpg, png, webp, gif).' };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: 'Immagine troppo grande (max 5 MB).' };
    }
    imageFile = file;
    imageBuffer = Buffer.from(await file.arrayBuffer());
  }

  if (!bodyRaw && !imageFile) {
    return { ok: false, error: 'Scrivi qualcosa o aggiungi una foto.' };
  }

  const moderation = moderatePostContent({
    text: bodyRaw || undefined,
  });
  if (!moderation.ok) {
    return { ok: false, error: moderation.error };
  }

  let lat = parseOptionalCoord(formData.get('lat'));
  let lng = parseOptionalCoord(formData.get('lng'));
  let locationLabel =
    String(formData.get('locationLabel') ?? '')
      .trim()
      .slice(0, 120) || null;

  if (lat != null && lng != null) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { ok: false, error: 'Coordinate foto non valide.' };
    }
    if (!imageFile) {
      lat = null;
      lng = null;
      locationLabel = null;
    } else {
      lat = coarseCoord(lat);
      lng = coarseCoord(lng);
      if (!locationLabel) {
        try {
          const place = await reverseGeocode(lat, lng);
          locationLabel = place
            ? [place.label, place.country].filter(Boolean).join(', ')
            : null;
          if (locationLabel && locationLabel.length > 120) {
            locationLabel = locationLabel.slice(0, 120);
          }
        } catch {
          /* label opzionale */
        }
      }
    }
  } else {
    lat = null;
    lng = null;
    locationLabel = null;
  }

  let imageUrl: string | null = null;
  if (imageFile && imageBuffer) {
    const ext =
      imageFile.type === 'image/png'
        ? 'png'
        : imageFile.type === 'image/webp'
          ? 'webp'
          : imageFile.type === 'image/gif'
            ? 'gif'
            : 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('post-media')
      .upload(path, imageBuffer, { contentType: imageFile.type, upsert: false });

    if (uploadError) {
      console.error('[createPost upload]', uploadError.message);
      return { ok: false, error: 'Impossibile caricare la foto.' };
    }

    const { data: pub } = supabaseAdmin.storage.from('post-media').getPublicUrl(path);
    imageUrl = pub.publicUrl || null;
  }

  const { data, error } = await supabaseAdmin
    .from('user_posts')
    .insert({
      user_id: userId,
      body: bodyRaw,
      image_url: imageUrl,
      lat,
      lng,
      location_label: locationLabel,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[createPost]', error.message);
    return { ok: false, error: 'Impossibile pubblicare il post.' };
  }

  const username = await getUsername(userId);
  revalidateSocial(username, userId);
  return { ok: true, postId: data?.id as string | undefined };
}

export async function deletePost(postId: string): Promise<PostActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Accedi per continuare.' };

  const id = z.string().uuid().safeParse(postId);
  if (!id.success) return { ok: false, error: 'Post non valido.' };

  const { data: post } = await supabaseAdmin
    .from('user_posts')
    .select('id, user_id, image_url')
    .eq('id', id.data)
    .maybeSingle();

  if (!post) return { ok: false, error: 'Post non trovato.' };
  if (post.user_id !== userId) {
    return { ok: false, error: 'Puoi eliminare solo i tuoi post.' };
  }

  const { error } = await supabaseAdmin.from('user_posts').delete().eq('id', id.data);
  if (error) {
    console.error('[deletePost]', error.message);
    return { ok: false, error: 'Impossibile eliminare il post.' };
  }

  // Best-effort cleanup storage
  const url = post.image_url as string | null;
  if (url?.includes('/post-media/')) {
    const marker = '/post-media/';
    const idx = url.indexOf(marker);
    if (idx >= 0) {
      const storagePath = decodeURIComponent(url.slice(idx + marker.length));
      void supabaseAdmin.storage.from('post-media').remove([storagePath]);
    }
  }

  const username = await getUsername(userId);
  revalidateSocial(username, userId);
  return { ok: true };
}

export async function togglePostLike(postId: string): Promise<PostActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'Accedi per mettere like.' };

  const id = z.string().uuid().safeParse(postId);
  if (!id.success) return { ok: false, error: 'Post non valido.' };

  const { data: existing } = await supabaseAdmin
    .from('post_likes')
    .select('post_id')
    .eq('post_id', id.data)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from('post_likes')
      .delete()
      .eq('post_id', id.data)
      .eq('user_id', userId);
    if (error) {
      console.error('[togglePostLike del]', error.message);
      return { ok: false, error: 'Impossibile aggiornare il like.' };
    }
  } else {
    const { error } = await supabaseAdmin.from('post_likes').insert({
      post_id: id.data,
      user_id: userId,
    });
    if (error) {
      console.error('[togglePostLike ins]', error.message);
      return { ok: false, error: 'Impossibile aggiornare il like.' };
    }
  }

  revalidatePath('/dashboard/bacheca');
  return { ok: true };
}
