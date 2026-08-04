-- Richieste di partecipazione: l'utente chiede, l'organizzatore accetta o rifiuta

CREATE TABLE IF NOT EXISTS trip_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  responded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT trip_join_requests_unique UNIQUE (trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS trip_join_requests_trip_pending_idx
  ON trip_join_requests (trip_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS trip_join_requests_user_idx
  ON trip_join_requests (user_id, status);

ALTER TABLE trip_join_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON trip_join_requests FROM anon, authenticated;
