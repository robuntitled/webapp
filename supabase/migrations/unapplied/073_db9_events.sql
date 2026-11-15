-- DB-9 · Tabella events (misure / UTM) — richiede decisione owner D-21 + testo privacy
-- UNAPPLIED — do not run without explicit owner approval.

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  session_id text,
  ref text,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_name_created_at_idx
  ON public.events (name, created_at DESC);

CREATE INDEX IF NOT EXISTS events_user_id_idx
  ON public.events (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- No broad public policies: inserts via service role / authenticated server actions only.
