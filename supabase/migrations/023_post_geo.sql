-- Georeferenziazione foto/post sulla mappa community

ALTER TABLE user_posts
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS location_label text;

ALTER TABLE user_posts DROP CONSTRAINT IF EXISTS user_posts_lat_range;
ALTER TABLE user_posts
  ADD CONSTRAINT user_posts_lat_range
  CHECK (lat IS NULL OR (lat >= -90 AND lat <= 90));

ALTER TABLE user_posts DROP CONSTRAINT IF EXISTS user_posts_lng_range;
ALTER TABLE user_posts
  ADD CONSTRAINT user_posts_lng_range
  CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180));

ALTER TABLE user_posts DROP CONSTRAINT IF EXISTS user_posts_location_label_len;
ALTER TABLE user_posts
  ADD CONSTRAINT user_posts_location_label_len
  CHECK (location_label IS NULL OR char_length(location_label) <= 120);

CREATE INDEX IF NOT EXISTS user_posts_geo_idx
  ON user_posts (created_at DESC)
  WHERE lat IS NOT NULL AND lng IS NOT NULL AND image_url IS NOT NULL;
