-- Notifiche in-app (campanella): join request, accettazione, rifiuto

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN (
      'trip_join_request',
      'trip_join_accepted',
      'trip_join_rejected'
    )),
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_unread_idx
  ON user_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx
  ON user_notifications (user_id, created_at DESC);

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_notifications FROM anon, authenticated;
