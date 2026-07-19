-- Recensioni tra utenti (dopo aver condiviso un viaggio)

CREATE TABLE IF NOT EXISTS user_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body text NOT NULL CHECK (char_length(trim(body)) >= 8 AND char_length(body) <= 800),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_reviews_no_self CHECK (reviewee_id <> reviewer_id),
  CONSTRAINT user_reviews_unique_pair UNIQUE (reviewee_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS user_reviews_reviewee_idx
  ON user_reviews (reviewee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_reviews_reviewer_idx
  ON user_reviews (reviewer_id);

ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_reviews FROM anon, authenticated;
GRANT SELECT ON user_reviews TO anon, authenticated;

CREATE POLICY "user_reviews_select_public"
  ON user_reviews FOR SELECT TO anon, authenticated
  USING (true);
