'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { profilePath } from '@/lib/profile/paths';

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
  let imageUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return { ok: false, error: 'Formato immagine non supportato (jpg, png, webp, gif).' };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, error: 'Immagine troppo grande (max 5 MB).' };
    }

    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : file.type === 'image/gif'
            ? 'gif'
            : 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('post-media')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('[createPost upload]', uploadError.message);
      return { ok: false, error: 'Impossibile caricare la foto.' };
    }

    const { data: pub } = supabaseAdmin.storage.from('post-media').getPublicUrl(path);
    imageUrl = pub.publicUrl || null;
  }

  if (!bodyRaw && !imageUrl) {
    return { ok: false, error: 'Scrivi qualcosa o aggiungi una foto.' };
  }

  const { data, error } = await supabaseAdmin
    .from('user_posts')
    .insert({
      user_id: userId,
      body: bodyRaw,
      image_url: imageUrl,
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
