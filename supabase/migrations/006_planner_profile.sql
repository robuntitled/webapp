-- Profilo planner viaggiatore (intake pre-composer) + bozza composer su cloud.
-- Applica con: npm run db:planner

CREATE TABLE IF NOT EXISTS planner_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS composer_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  draft jsonb NOT NULL DEFAULT '{}',
  current_step text NOT NULL DEFAULT 'intake',
  planner_profile jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS composer_drafts_user_updated_idx
  ON composer_drafts(user_id, updated_at DESC);

ALTER TABLE planner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE composer_drafts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON planner_profiles FROM anon, authenticated;
REVOKE ALL ON composer_drafts FROM anon, authenticated;