-- NomadLink: chat crew per viaggio.
-- Applica con: npm run db:chat

CREATE TABLE IF NOT EXISTS trip_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_messages_trip_created_idx
  ON trip_messages(trip_id, created_at DESC);

ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON trip_messages FROM anon, authenticated;