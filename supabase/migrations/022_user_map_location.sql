-- Posizione mappa community (bacheca): opt-in esplicito

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS map_lat double precision,
  ADD COLUMN IF NOT EXISTS map_lng double precision,
  ADD COLUMN IF NOT EXISTS map_label text,
  ADD COLUMN IF NOT EXISTS map_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS map_updated_at timestamptz;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_map_lat_range;
ALTER TABLE users
  ADD CONSTRAINT users_map_lat_range
  CHECK (map_lat IS NULL OR (map_lat >= -90 AND map_lat <= 90));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_map_lng_range;
ALTER TABLE users
  ADD CONSTRAINT users_map_lng_range
  CHECK (map_lng IS NULL OR (map_lng >= -180 AND map_lng <= 180));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_map_label_len;
ALTER TABLE users
  ADD CONSTRAINT users_map_label_len
  CHECK (map_label IS NULL OR char_length(map_label) <= 120);

CREATE INDEX IF NOT EXISTS users_map_visible_idx
  ON users (map_visible, map_updated_at DESC)
  WHERE map_visible = true
    AND map_lat IS NOT NULL
    AND map_lng IS NOT NULL;
