-- Inviti viaggio ad amici (accetta / rifiuta)

CREATE TABLE IF NOT EXISTS trip_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT trip_invites_no_self CHECK (from_user_id <> to_user_id),
  CONSTRAINT trip_invites_unique_pending UNIQUE (trip_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS trip_invites_to_pending_idx
  ON trip_invites (to_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS trip_invites_trip_idx
  ON trip_invites (trip_id, status);

ALTER TABLE trip_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON trip_invites FROM anon, authenticated;
