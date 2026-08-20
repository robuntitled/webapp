-- Loyalty v2: azioni, founding creator, boost Esplora, automazioni, referral.
-- Applica con: npm run db:exec -- supabase/migrations/028_points_loyalty.sql

ALTER TABLE nomad_points_ledger DROP CONSTRAINT IF EXISTS nomad_points_ledger_action_check;
ALTER TABLE nomad_points_ledger ADD CONSTRAINT nomad_points_ledger_action_check
  CHECK (action IN (
    'create_trip_published',
    'group_formed',
    'group_doubled',
    'invite_register',
    'invite_join_trip',
    'invite_trip_departed',
    'joined_trip',
    'referral_join',
    'review_written',
    'review_verified',
    'profile_completed',
    'day90_bonus',
    'redeem'
  ));

ALTER TABLE trips ADD COLUMN IF NOT EXISTS boost_until timestamptz;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS boost_source text;
CREATE INDEX IF NOT EXISTS trips_boost_until_idx ON trips (boost_until DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS founding_creators (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  rank integer NOT NULL CHECK (rank >= 1 AND rank <= 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT founding_creators_rank_unique UNIQUE (rank)
);

ALTER TABLE founding_creators ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON founding_creators FROM anon, authenticated;

ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users (referred_by_user_id);

CREATE TABLE IF NOT EXISTS user_perks (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  perk_id text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, perk_id)
);

ALTER TABLE user_perks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_perks FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS automation_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ref text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_sends_unique UNIQUE (kind, user_id, ref)
);

CREATE INDEX IF NOT EXISTS automation_sends_kind_idx ON automation_sends (kind, sent_at DESC);

ALTER TABLE automation_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON automation_sends FROM anon, authenticated;

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
    'threshold_reached'
  ));
