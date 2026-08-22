-- Pratiche personali + edizioni ufficiali/private (spec fogli 04, 08).

CREATE TABLE IF NOT EXISTS itinerary_templates (
  id text PRIMARY KEY,
  destination_slug text NOT NULL,
  duration_days int NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination_slug, duration_days)
);

CREATE TABLE IF NOT EXISTS editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL,
  date_from date NOT NULL,
  date_to date NOT NULL,
  edition_type text NOT NULL CHECK (edition_type IN ('official', 'private')),
  min_confirmed int NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'formed', 'locked', 'closed')),
  invite_token text UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edition_members (
  edition_id uuid NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'confirmed', 'left')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (edition_id, user_id)
);

CREATE TABLE IF NOT EXISTS practices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id text NOT NULL,
  edition_id uuid REFERENCES editions(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN ('solo', 'friends', 'group')),
  date_from date NOT NULL,
  date_to date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'preparing', 'ready', 'cancelled')),
  flight_confirmed_at timestamptz,
  hotel_confirmed_at timestamptz,
  activity_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS editions_template_idx ON editions (template_id, edition_type, status);
CREATE INDEX IF NOT EXISTS practices_user_idx ON practices (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS editions_official_unique
  ON editions (template_id, date_from)
  WHERE edition_type = 'official';

INSERT INTO itinerary_templates (id, destination_slug, duration_days, payload, status)
VALUES
  ('thailandia-10d', 'thailandia', 10, '{"source":"sheet-06"}', 'published'),
  ('thailandia-14d', 'thailandia', 14, '{"source":"sheet-06"}', 'published'),
  ('thailandia-21d', 'thailandia', 21, '{"source":"sheet-06"}', 'published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO editions (template_id, date_from, date_to, edition_type, min_confirmed, status)
VALUES
  ('thailandia-10d', '2026-11-12', '2026-11-21', 'official', 4, 'open'),
  ('thailandia-14d', '2026-12-05', '2026-12-18', 'official', 4, 'open'),
  ('thailandia-21d', '2027-01-08', '2027-01-28', 'official', 6, 'open')
ON CONFLICT DO NOTHING;
