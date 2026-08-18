-- NomadPoints: programma loyalty a punti per azioni sulla piattaforma.
-- Punti NON monetari, riscattabili solo in perk di piattaforma (no denaro, no cashback).
-- Slegato dall'importo dei viaggi/servizi (loyalty puro, non promozione a premi).
-- Applica con: npm run db:exec -- supabase/migrations/027_nomad_points.sql

CREATE TABLE IF NOT EXISTS nomad_points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- azione che ha generato/consumato punti
  action text NOT NULL CHECK (action IN (
    'create_trip_published',
    'group_formed',
    'referral_join',
    'joined_trip',
    'review_written',
    'profile_completed',
    'redeem'
  )),
  -- positivo = guadagno, negativo = riscatto perk
  points integer NOT NULL,
  -- chiave di idempotenza per azione (es. trip_id, invite_id, perk_id)
  ref text NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nomad_points_ledger_unique UNIQUE (user_id, action, ref)
);

CREATE INDEX IF NOT EXISTS nomad_points_ledger_user_idx
  ON nomad_points_ledger (user_id, created_at DESC);

ALTER TABLE nomad_points_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nomad_points_ledger FROM anon, authenticated;
