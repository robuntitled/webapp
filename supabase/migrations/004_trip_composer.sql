-- NomadLink Trip Composer: giorni, blocchi, quote travel.
-- Applica con: npm run db:composer

DO $$ BEGIN
  CREATE TYPE block_type AS ENUM (
    'flight', 'hotel', 'attraction', 'transport',
    'meal', 'free_time', 'note', 'activity'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS composer_version smallint,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived'));

UPDATE trips SET status = 'published' WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS trip_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_index int NOT NULL CHECK (day_index >= 1),
  day_date date NOT NULL,
  title text,
  summary text,
  UNIQUE (trip_id, day_index)
);

CREATE TABLE IF NOT EXISTS travel_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_type text NOT NULL CHECK (quote_type IN ('flight', 'hotel')),
  provider text NOT NULL DEFAULT 'travelpayouts',
  cache_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS travel_quotes_cache_key_idx ON travel_quotes(cache_key);

CREATE TABLE IF NOT EXISTS trip_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id uuid NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  block_type block_type NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  travel_quote_id uuid REFERENCES travel_quotes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_blocks_day_order_idx ON trip_blocks(trip_day_id, sort_order);

ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_quotes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON trip_days FROM anon, authenticated;
REVOKE ALL ON trip_blocks FROM anon, authenticated;
REVOKE ALL ON travel_quotes FROM anon, authenticated;