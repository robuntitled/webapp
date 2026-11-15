-- DB-14 · Snapshot prezzo/commissione lato server (report margine)
-- UNAPPLIED — do not run without owner approval.
-- practices.flight_bookings is jsonb (045); this table holds durable economics for reporting.

CREATE TABLE IF NOT EXISTS public.booking_price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL REFERENCES public.practices (id) ON DELETE CASCADE,
  booking_ref text,
  amount_eur numeric(12, 2) NOT NULL,
  commission_eur numeric(12, 2),
  currency text NOT NULL DEFAULT 'EUR',
  provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_price_snapshots_practice_id_idx
  ON public.booking_price_snapshots (practice_id);

ALTER TABLE public.booking_price_snapshots ENABLE ROW LEVEL SECURITY;
