-- Onboarding primo login: intent, keywords tassonomiche, base abituale.
-- Applica con: npm run db:onboarding

CREATE TABLE IF NOT EXISTS interest_keywords (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('trip_type', 'setting', 'experience')),
  label_it text NOT NULL,
  emoji text,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_interests (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword_id text NOT NULL REFERENCES interest_keywords(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'onboarding',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS user_interests_keyword_idx
  ON user_interests (keyword_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS travel_intent text,
  ADD COLUMN IF NOT EXISTS home_city text,
  ADD COLUMN IF NOT EXISTS home_country text,
  ADD COLUMN IF NOT EXISTS home_lat double precision,
  ADD COLUMN IF NOT EXISTS home_lng double precision,
  ADD COLUMN IF NOT EXISTS home_place_id text;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_travel_intent_check;
ALTER TABLE users
  ADD CONSTRAINT users_travel_intent_check
  CHECK (travel_intent IS NULL OR travel_intent IN ('create', 'book'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_home_lat_range;
ALTER TABLE users
  ADD CONSTRAINT users_home_lat_range
  CHECK (home_lat IS NULL OR (home_lat >= -90 AND home_lat <= 90));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_home_lng_range;
ALTER TABLE users
  ADD CONSTRAINT users_home_lng_range
  CHECK (home_lng IS NULL OR (home_lng >= -180 AND home_lng <= 180));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_home_city_len;
ALTER TABLE users
  ADD CONSTRAINT users_home_city_len
  CHECK (home_city IS NULL OR char_length(home_city) <= 120);

CREATE INDEX IF NOT EXISTS users_travel_intent_idx
  ON users (travel_intent)
  WHERE travel_intent IS NOT NULL;

INSERT INTO interest_keywords (id, category, label_it, emoji, sort_order) VALUES
  ('city_break', 'trip_type', 'City break', '🏙️', 1),
  ('road_trip', 'trip_type', 'Road trip', '🚗', 2),
  ('backpacking', 'trip_type', 'Zaino in spalla', '🎒', 3),
  ('slow_travel', 'trip_type', 'Slow travel', '🐢', 4),
  ('adventure', 'trip_type', 'Avventura', '🏔️', 5),
  ('wellness_trip', 'trip_type', 'Relax & wellness', '🧘', 6),
  ('cultural_tour', 'trip_type', 'Viaggio culturale', '🏛️', 7),
  ('food_trip', 'trip_type', 'Food trip', '🍷', 8),
  ('luxury', 'trip_type', 'Lusso', '✨', 9),
  ('family_trip', 'trip_type', 'In famiglia', '👨‍👩‍👧', 10),
  ('digital_nomad', 'trip_type', 'Digital nomad', '💻', 11),
  ('festival', 'trip_type', 'Festival / eventi', '🎉', 12),
  ('city', 'setting', 'Città', '🌆', 1),
  ('nature', 'setting', 'Natura', '🌿', 2),
  ('beach', 'setting', 'Mare', '🏖️', 3),
  ('mountains', 'setting', 'Montagna', '⛰️', 4),
  ('countryside', 'setting', 'Campagna', '🌾', 5),
  ('islands', 'setting', 'Isole', '🏝️', 6),
  ('desert', 'setting', 'Deserto / savana', '🏜️', 7),
  ('culture', 'experience', 'Musei e storia', '📜', 1),
  ('food_wine', 'experience', 'Cibo e vino', '🍽️', 2),
  ('nightlife', 'experience', 'Vita notturna', '🌙', 3),
  ('outdoor', 'experience', 'Sport e outdoor', '🥾', 4),
  ('wellness', 'experience', 'Spa e benessere', '💆', 5),
  ('photography', 'experience', 'Fotografia', '📸', 6),
  ('local_life', 'experience', 'Vita locale', '🏘️', 7),
  ('shopping', 'experience', 'Shopping', '🛍️', 8),
  ('wildlife', 'experience', 'Wildlife / safari', '🦁', 9)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  label_it = EXCLUDED.label_it,
  emoji = EXCLUDED.emoji,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE interest_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON interest_keywords FROM anon, authenticated;
REVOKE ALL ON user_interests FROM anon, authenticated;
