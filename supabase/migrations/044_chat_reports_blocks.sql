-- A5 / M4: segnalazioni (Segnala) e blocchi utente (Blocca) per chat di gruppo.
-- File di migrazione presente nel repo: NON applicare in produzione da questo agente.
-- Usare solo dopo review owner (db:exec / bootstrap esplicito) + prerequisiti legali (C7).

CREATE TABLE IF NOT EXISTS chat_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edition_id uuid REFERENCES editions(id) ON DELETE SET NULL,
  message_id uuid REFERENCES edition_messages(id) ON DELETE SET NULL,
  reported_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target text NOT NULL CHECK (target IN ('message', 'profile', 'group')),
  reason text NOT NULL CHECK (char_length(reason) >= 1 AND char_length(reason) <= 1000),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_reports_reporter_created_idx
  ON chat_reports (reporter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_reports_edition_created_idx
  ON chat_reports (edition_id, created_at DESC)
  WHERE edition_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chat_reports_status_idx
  ON chat_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx
  ON user_blocks (blocked_id);

CREATE TABLE IF NOT EXISTS moderation_sanctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('warning', 'mute', 'ban', 'other')),
  reason text NOT NULL CHECK (char_length(reason) >= 1 AND char_length(reason) <= 2000),
  report_id uuid REFERENCES chat_reports(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_sanctions_user_idx
  ON moderation_sanctions (user_id, created_at DESC);

ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_sanctions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON chat_reports FROM anon, authenticated;
REVOKE ALL ON user_blocks FROM anon, authenticated;
REVOKE ALL ON moderation_sanctions FROM anon, authenticated;

COMMENT ON TABLE chat_reports IS
  'Segnalazioni chat/profilo/gruppo (DSA). Applicare solo dopo ok legale/owner.';
COMMENT ON TABLE user_blocks IS
  'Blocchi utente peer-to-peer: i messaggi del bloccato restano nascosti al blocker.';
COMMENT ON TABLE moderation_sanctions IS
  'Registro sanzioni (DSA art. 17 motivazione). Uso admin / follow-up.';
