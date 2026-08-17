-- Crediti cashback su prenotazioni confermate (brokerage).
-- Applica con: npm run db:exec -- supabase/migrations/026_cashback_ledger.sql

CREATE TABLE IF NOT EXISTS cashback_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  booking_ref text NOT NULL,
  service text NOT NULL CHECK (service IN ('flight', 'hotel', 'car', 'attraction')),
  amount_eur numeric(12, 2) NOT NULL CHECK (amount_eur >= 0),
  credit_eur numeric(12, 2) NOT NULL CHECK (credit_eur >= 0),
  rate numeric(6, 4) NOT NULL CHECK (rate >= 0 AND rate <= 1),
  role text NOT NULL CHECK (role IN ('creator', 'participant')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'earned', 'clawback')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cashback_ledger_booking_unique UNIQUE (user_id, booking_ref, service)
);

CREATE INDEX IF NOT EXISTS cashback_ledger_user_idx
  ON cashback_ledger (user_id, created_at DESC);

ALTER TABLE cashback_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cashback_ledger FROM anon, authenticated;
