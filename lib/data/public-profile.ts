import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isTripEnded } from '@/lib/utils/trip';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PublicProfile = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  country: string | null;
  city: string | null;
  phoneVerified: boolean;
  tripsOrganized: number;
  tripsJoined: number;
};

export type PublicProfileTrip = {
  id: string;
  title: string;
  destination: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  price: number;
};

export async function getPublicProfile(
  usernameOrId: string
): Promise<PublicProfile | null> {
  const key = usernameOrId.trim();
  if (!key) return null;

  let query = supabaseAdmin
    .from('users')
    .select(
      'id, username, first_name, last_name, image, country, address_city, phone_verified_at'
    );

  if (UUID_RE.test(key)) {
    query = query.eq('id', key);
  } else {
    query = query.eq('username', key.toLowerCase());
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) {
    if (error) console.error('[public-profile]', error.message);
    return null;
  }

  const [{ count: organized }, { count: joined }] = await Promise.all([
    supabaseAdmin
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', data.id),
    supabaseAdmin
      .from('trip_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', data.id),
  ]);

  return {
    id: data.id,
    username: (data.username as string | null)?.trim() || `user_${String(data.id).slice(0, 8)}`,
    firstName: data.first_name,
    lastName: data.last_name,
    image: data.image,
    country: data.country,
    city: data.address_city,
    phoneVerified: Boolean(data.phone_verified_at),
    tripsOrganized: organized ?? 0,
    // partecipazioni totali (include anche i viaggi dove è owner in trip_participants)
    tripsJoined: joined ?? 0,
  };
}

/** Viaggi pubblicati dell’organizzatore (non conclusi, max 12). */
export async function getPublicOrganizedTrips(
  userId: string
): Promise<PublicProfileTrip[]> {
  const { data, error } = await supabaseAdmin
    .from('trips')
    .select(
      'id, title, destination, imageUrl:image_url, startDate:start_date, endDate:end_date, price'
    )
    .eq('creator_id', userId)
    .order('start_date', { ascending: true })
    .limit(24);

  if (error || !data) {
    if (error) console.error('[public-profile trips]', error.message);
    return [];
  }

  return (data as PublicProfileTrip[])
    .filter((t) => !isTripEnded(t.endDate))
    .slice(0, 12);
}
