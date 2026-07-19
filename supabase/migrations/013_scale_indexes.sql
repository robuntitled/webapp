-- Indici per feed, chat, auth lookup e cache Places (scalabilità lettura).
-- Colonne camelCase del DB legacy vanno quotate.

-- Trip feed / filtri comuni
CREATE INDEX IF NOT EXISTS trips_status_created_at_idx
  ON public.trips (status, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS trips_creator_id_idx
  ON public.trips (creator_id);

CREATE INDEX IF NOT EXISTS trips_start_date_idx
  ON public.trips (start_date);

-- Partecipanti / preferiti
CREATE INDEX IF NOT EXISTS trip_participants_user_id_idx
  ON public.trip_participants (user_id);

CREATE INDEX IF NOT EXISTS trip_participants_trip_id_idx
  ON public.trip_participants (trip_id);

CREATE INDEX IF NOT EXISTS favorite_trips_user_id_idx
  ON public.favorite_trips (user_id);

-- Chat per trip (timeline)
CREATE INDEX IF NOT EXISTS trip_messages_trip_created_idx
  ON public.trip_messages (trip_id, created_at DESC);

-- Auth / trust lookups
CREATE INDEX IF NOT EXISTS users_email_lower_idx
  ON public.users (lower(email));

CREATE INDEX IF NOT EXISTS users_username_idx
  ON public.users (username)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_phone_verified_idx
  ON public.users (phone_verified_at)
  WHERE phone_verified_at IS NOT NULL;

-- Places cache
CREATE INDEX IF NOT EXISTS places_search_cache_hit_count_idx
  ON public.places_search_cache (hit_count DESC);

CREATE INDEX IF NOT EXISTS places_details_cache_updated_at_idx
  ON public.places_details_cache (updated_at DESC);
