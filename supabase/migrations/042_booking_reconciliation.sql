-- Prenotazioni provider riuscite ma non ancora salvate sulla pratica.
-- File di migrazione presente nel repo: NON applicare in produzione da questo agente.
-- Usare solo dopo review owner (db:exec / bootstrap esplicito).

CREATE TABLE IF NOT EXISTS booking_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  practice_id uuid,
  kind text NOT NULL CHECK (kind IN ('flight', 'hotel')),
  provider text NOT NULL DEFAULT 'liteapi',
  provider_booking_id text,
  provider_booking_ref text,
  provider_status text,
  amount_eur numeric,
  currency text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_reconciliation'
    CHECK (status IN ('pending_reconciliation', 'resolved', 'abandoned')),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_reconciliation_pending_idx
  ON booking_reconciliation (status, created_at DESC)
  WHERE status = 'pending_reconciliation';

CREATE INDEX IF NOT EXISTS booking_reconciliation_provider_idx
  ON booking_reconciliation (provider_booking_id)
  WHERE provider_booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS booking_reconciliation_user_idx
  ON booking_reconciliation (user_id, created_at DESC);

COMMENT ON TABLE booking_reconciliation IS
  'Orphan bookings: LiteAPI book/pay ok, salvataggio pratica fallito. Follow-up manuale.';
