-- Chat di gruppo sulle edizioni (partenze ufficiali + amici).

CREATE TABLE IF NOT EXISTS edition_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edition_messages_edition_created_idx
  ON edition_messages (edition_id, created_at DESC);

CREATE TABLE IF NOT EXISTS edition_chat_reads (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, edition_id)
);

CREATE TABLE IF NOT EXISTS edition_chat_hides (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, edition_id)
);

ALTER TABLE edition_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE edition_chat_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE edition_chat_hides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON edition_messages FROM anon, authenticated;
REVOKE ALL ON edition_chat_reads FROM anon, authenticated;
REVOKE ALL ON edition_chat_hides FROM anon, authenticated;

ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;
ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check
  CHECK (type IN (
    'trip_join_request',
    'trip_join_accepted',
    'trip_join_rejected',
    'trip_feedback',
    'second_trip',
    'day90_incentive',
    'dormant',
    'threshold_near',
    'threshold_reached',
    'edition_member_joined',
    'edition_flight_confirmed',
    'edition_reminder'
  ));
