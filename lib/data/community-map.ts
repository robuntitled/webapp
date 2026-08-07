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
