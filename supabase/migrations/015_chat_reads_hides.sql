-- Chat: last-read (badge unread) + hide per utente ("elimina chat" = nascondi per me)

CREATE TABLE IF NOT EXISTS trip_chat_reads (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trip_id)
);

CREATE INDEX IF NOT EXISTS trip_chat_reads_trip_idx
  ON trip_chat_reads (trip_id);

CREATE TABLE IF NOT EXISTS trip_chat_hides (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, trip_id)
);

CREATE INDEX IF NOT EXISTS trip_chat_hides_user_idx
  ON trip_chat_hides (user_id);

-- Ricerca: filtro per trip_id + ILIKE su body (indice trip già presente)
CREATE INDEX IF NOT EXISTS trip_messages_user_created_idx
  ON trip_messages (user_id, created_at DESC);

ALTER TABLE trip_chat_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_chat_hides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON trip_chat_reads FROM anon, authenticated;
REVOKE ALL ON trip_chat_hides FROM anon, authenticated;
