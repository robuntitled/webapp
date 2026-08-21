-- Catalogo destinazioni + template per durata (seed da lib/catalog).
-- Applica con: npm run db:catalog

CREATE TABLE IF NOT EXISTS destinations (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  country text NOT NULL,
  continent text NOT NULL,
  allowed_durations int[] NOT NULL DEFAULT '{7}',
  typical_departure_airports_it text[] NOT NULL DEFAULT '{FCO,MXP}',
  active boolean NOT NULL DEFAULT false,
  lat double precision,
  lng double precision,
  emoji text,
  vibe text,
  gradient text,
  timezone text,
  currency_hint text DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_templates (
  id text PRIMARY KEY,
  destination_id text NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  duration_days int NOT NULL CHECK (duration_days >= 3 AND duration_days <= 30),
  title text NOT NULL,
  summary text,
  days jsonb NOT NULL DEFAULT '[]',
  suggested_hotel jsonb,
  paid_activities jsonb NOT NULL DEFAULT '[]',
  free_highlights jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination_id, duration_days)
);

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS destination_id text,
  ADD COLUMN IF NOT EXISTS template_id text,
  ADD COLUMN IF NOT EXISTS duration_days int,
  ADD COLUMN IF NOT EXISTS hotel_rule text NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS departure_city text;

ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_hotel_rule_check;
ALTER TABLE trips
  ADD CONSTRAINT trips_hotel_rule_check
  CHECK (hotel_rule IN ('A', 'B', 'C'));

CREATE INDEX IF NOT EXISTS trip_templates_destination_idx ON trip_templates (destination_id);
CREATE INDEX IF NOT EXISTS destinations_active_idx ON destinations (active) WHERE active = true;
