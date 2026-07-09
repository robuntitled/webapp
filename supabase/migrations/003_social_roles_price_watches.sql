-- NomadLink: ruoli partecipanti, modalità solo/gruppo, monitoraggio prezzi affiliate.
-- Applica con: npm run db:social (richiede SUPABASE_DB_URL in .env.local)

DO $$ BEGIN
  CREATE TYPE participant_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS planning_mode text NOT NULL DEFAULT 'group'
    CHECK (planning_mode IN ('solo', 'group'));

ALTER TABLE trip_participants
  ADD COLUMN IF NOT EXISTS role participant_role NOT NULL DEFAULT 'viewer',
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();

UPDATE trip_participants tp
SET role = 'owner'
FROM trips t
WHERE tp.trip_id = t.id AND tp.user_id = t.creator_id;

INSERT INTO trip_participants (trip_id, user_id, role)
SELECT t.id, t.creator_id, 'owner'
FROM trips t
WHERE NOT EXISTS (
  SELECT 1 FROM trip_participants tp
  WHERE tp.trip_id = t.id AND tp.user_id = t.creator_id
);

CREATE TABLE IF NOT EXISTS price_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  watch_type text NOT NULL CHECK (watch_type IN ('flight', 'hotel')),
  destination_text text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  adults int NOT NULL DEFAULT 1 CHECK (adults >= 1 AND adults <= 9),
  last_price numeric,
  last_currency text NOT NULL DEFAULT 'EUR',
  affiliate_url text,
  affiliate_provider text NOT NULL DEFAULT 'travelpayouts',
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, watch_type)
);

CREATE INDEX IF NOT EXISTS price_watches_trip_id_idx ON price_watches(trip_id);

ALTER TABLE price_watches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON price_watches FROM anon, authenticated;