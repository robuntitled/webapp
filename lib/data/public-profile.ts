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
  emailVerified: boolean;
  tripsOrganized: number;
  tripsJoined: number;
  ratingAvg: number | null;
  ratingCount: number;
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

export type PublicProfileReview = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  tripTitle: string | null;
  reviewer: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  };
};

export async function getPublicProfile(
  usernameOrId: string
): Promise<PublicProfile | null> {
  const key = usernameOrId.trim();
  if (!key) return null;

  let query = supabaseAdmin
    .from('users')
    .select(
      'id, username, first_name, last_name, image, country, address_city, phone_verified_at, email_verified_at'
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

  const [{ count: organized }, { count: joined }, reviewsAgg] = await Promise.all([
    supabaseAdmin
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', data.id),
    supabaseAdmin
      .from('trip_participants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', data.id)
      .neq('role', 'owner'),
    supabaseAdmin
      .from('user_reviews')
      .select('rating')
      .eq('reviewee_id', data.id),
  ]);

  if (reviewsAgg.error) {
    console.error('[public-profile ratings]', reviewsAgg.error.message);
  }

  const ratings = (reviewsAgg.data ?? [])
    .map((r) => Number(r.rating))
    .filter((n) => n >= 1 && n <= 5);
  const ratingCount = ratings.length;
  const ratingAvg =
    ratingCount > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratingCount) * 10) / 10
      : null;

  return {
    id: data.id,
    username: (data.username as string | null)?.trim() || `user_${String(data.id).slice(0, 8)}`,
    firstName: data.first_name,
    lastName: data.last_name,
    image: data.image,
    country: data.country,
    city: data.address_city,
    phoneVerified: Boolean(data.phone_verified_at),
    emailVerified: Boolean(data.email_verified_at),
    tripsOrganized: organized ?? 0,
    tripsJoined: joined ?? 0,
    ratingAvg,
    ratingCount,
  };
}

function mapTripRows(data: unknown[]): PublicProfileTrip[] {
  return (data as PublicProfileTrip[])
    .filter((t) => t?.id && !isTripEnded(t.endDate))
    .slice(0, 12);
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

  return mapTripRows(data);
}

/** Viaggi a cui partecipa (non come owner), non conclusi. */
export async function getPublicJoinedTrips(
  userId: string
): Promise<PublicProfileTrip[]> {
  const { data: parts, error: pErr } = await supabaseAdmin
    .from('trip_participants')
    .select('trip_id, role')
    .eq('user_id', userId)
    .neq('role', 'owner')
    .limit(40);

  if (pErr || !parts?.length) {
    if (pErr) console.error('[public-profile joined]', pErr.message);
    return [];
  }

  const tripIds = parts.map((p) => p.trip_id as string);
  const { data, error } = await supabaseAdmin
    .from('trips')
    .select(
      'id, title, destination, imageUrl:image_url, startDate:start_date, endDate:end_date, price, creator_id'
    )
    .in('id', tripIds)
    .neq('creator_id', userId)
    .order('start_date', { ascending: true });

  if (error || !data) {
    if (error) console.error('[public-profile joined trips]', error.message);
    return [];
  }

  return mapTripRows(data);
}

export async function getPublicReviews(
  userId: string,
  limit = 20
): Promise<PublicProfileReview[]> {
  const { data, error } = await supabaseAdmin
    .from('user_reviews')
    .select('id, rating, body, created_at, trip_id, reviewer_id')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error('[public-profile reviews]', error.message);
    return [];
  }

  const reviewerIds = [...new Set(data.map((r) => r.reviewer_id as string))];
  const tripIds = [
    ...new Set(data.map((r) => r.trip_id as string | null).filter(Boolean)),
  ] as string[];

  const [{ data: reviewers }, { data: trips }] = await Promise.all([
    reviewerIds.length
      ? supabaseAdmin
          .from('users')
          .select('id, username, first_name, last_name, image')
          .in('id', reviewerIds)
      : Promise.resolve({ data: [] as never[] }),
    tripIds.length
      ? supabaseAdmin.from('trips').select('id, title').in('id', tripIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const reviewerMap = new Map(
    (reviewers ?? []).map((u) => [u.id as string, u])
  );
  const tripMap = new Map((trips ?? []).map((t) => [t.id as string, t]));

  return data.map((row) => {
    const reviewer = reviewerMap.get(row.reviewer_id as string);
    const trip = row.trip_id ? tripMap.get(row.trip_id as string) : null;

    return {
      id: row.id as string,
      rating: Number(row.rating),
      body: String(row.body ?? ''),
      createdAt: String(row.created_at),
      tripTitle: (trip?.title as string | undefined) ?? null,
      reviewer: {
        id: (reviewer?.id as string) ?? '',
        username: (reviewer?.username as string | null) ?? null,
        firstName: (reviewer?.first_name as string | null) ?? null,
        lastName: (reviewer?.last_name as string | null) ?? null,
        image: (reviewer?.image as string | null) ?? null,
      },
    };
  });
}

/** True se i due utenti hanno condiviso almeno un viaggio. */
export async function haveSharedTrip(
  userA: string,
  userB: string
): Promise<boolean> {
  if (!userA || !userB || userA === userB) return false;

  const { data: aTrips, error: aErr } = await supabaseAdmin
    .from('trip_participants')
    .select('trip_id')
    .eq('user_id', userA);

  if (aErr || !aTrips?.length) return false;
  const ids = aTrips.map((t) => t.trip_id as string);

  const { count, error } = await supabaseAdmin
    .from('trip_participants')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userB)
    .in('trip_id', ids);

  if (error) return false;
  return (count ?? 0) > 0;
}

export async function getExistingReview(
  revieweeId: string,
  reviewerId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('user_reviews')
    .select('id')
    .eq('reviewee_id', revieweeId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle();
  return Boolean(data?.id);
}
