-- DB-15 · Tratte osservate per avviso prezzo («motivi per tornare»)
-- UNAPPLIED — do not run without owner approval.

CREATE TABLE IF NOT EXISTS public.watched_flight_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  practice_id uuid REFERENCES public.practices (id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  depart_date date,
  last_price_eur numeric(12, 2),
  alert_below_eur numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watched_flight_legs_user_id_idx
  ON public.watched_flight_legs (user_id);

ALTER TABLE public.watched_flight_legs ENABLE ROW LEVEL SECURITY;
