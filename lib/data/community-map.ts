import { supabaseAdmin } from '@/lib/supabase-admin';
import { profilePath } from '@/lib/profile/paths';

export type CommunityMapPin = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  lat: number;
  lng: number;
  label: string | null;
  href: string | null;
  updatedAt: string | null;
};

export type MyMapLocation = {
  lat: number | null;
  lng: number | null;
  label: string | null;
  visible: boolean;
  updatedAt: string | null;
};

export async function listCommunityMapPins(
  limit = 500
): Promise<CommunityMapPin[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(
      'id, username, first_name, last_name, image, map_lat, map_lng, map_label, map_updated_at'
    )
    .eq('map_visible', true)
    .not('map_lat', 'is', null)
    .not('map_lng', 'is', null)
    .order('map_updated_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('[listCommunityMapPins]', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const lat = Number(row.map_lat);
      const lng = Number(row.map_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const username = (row.username as string | null) ?? null;
      return {
        id: row.id as string,
        username,
        firstName: (row.first_name as string | null) ?? null,
        lastName: (row.last_name as string | null) ?? null,
        image: (row.image as string | null) ?? null,
        lat,
        lng,
        label: (row.map_label as string | null) ?? null,
        href: profilePath(username, row.id as string),
        updatedAt: (row.map_updated_at as string | null) ?? null,
      } satisfies CommunityMapPin;
    })
    .filter((p): p is CommunityMapPin => p !== null);
}

export type CommunityPhotoPin = {
  id: string;
  imageUrl: string;
  lat: number;
  lng: number;
  label: string | null;
  body: string;
  createdAt: string;
  author: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  href: string | null;
};

export async function listCommunityPhotoPins(
  limit = 200
): Promise<CommunityPhotoPin[]> {
  const { data, error } = await supabaseAdmin
    .from('user_posts')
    .select('id, user_id, body, image_url, lat, lng, location_label, created_at')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[listCommunityPhotoPins]', error.message);
    return [];
  }

  const rows = data ?? [];
  if (!rows.length) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id as string))];
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, username, first_name, last_name')
    .in('id', userIds);
  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));

  return rows
    .map((row) => {
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      const imageUrl = row.image_url as string | null;
      if (!imageUrl || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const u = userMap.get(row.user_id as string);
      if (!u) return null;
      const username = (u.username as string | null) ?? null;
      return {
        id: row.id as string,
        imageUrl,
        lat,
        lng,
        label: (row.location_label as string | null) ?? null,
        body: String(row.body ?? ''),
        createdAt: String(row.created_at),
        author: {
          id: u.id as string,
          username,
          firstName: (u.first_name as string | null) ?? null,
          lastName: (u.last_name as string | null) ?? null,
        },
        href: profilePath(username, u.id as string),
      } satisfies CommunityPhotoPin;
    })
    .filter((p): p is CommunityPhotoPin => p !== null);
}

export async function getMyMapLocation(
  userId: string
): Promise<MyMapLocation | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('map_lat, map_lng, map_label, map_visible, map_updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[getMyMapLocation]', error.message);
    return null;
  }

  return {
    lat: data.map_lat != null ? Number(data.map_lat) : null,
    lng: data.map_lng != null ? Number(data.map_lng) : null,
    label: (data.map_label as string | null) ?? null,
    visible: Boolean(data.map_visible),
    updatedAt: (data.map_updated_at as string | null) ?? null,
  };
}
