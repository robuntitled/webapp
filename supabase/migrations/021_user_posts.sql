-- MVP social: post testo/foto + like + storage

CREATE TABLE IF NOT EXISTS user_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_posts_body_len CHECK (char_length(body) <= 2000),
  CONSTRAINT user_posts_has_content CHECK (
    char_length(trim(body)) > 0 OR image_url IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS user_posts_feed_idx
  ON user_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS user_posts_user_idx
  ON user_posts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id uuid NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_likes_user_idx
  ON post_likes (user_id, created_at DESC);

ALTER TABLE user_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_posts FROM anon, authenticated;
REVOKE ALL ON post_likes FROM anon, authenticated;

-- Bucket foto post (lettura pubblica; scrittura solo service_role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "post_media_public_read" ON storage.objects;
CREATE POLICY "post_media_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'post-media');
