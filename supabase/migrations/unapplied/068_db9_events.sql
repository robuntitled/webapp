-- DB-9 · Tabella events (+ eventuale ref corto) — 👤 owner decision D-21
-- UNAPPLIED — do not run without explicit owner approval + privacy text.
--
-- Intended DDL (commented; stub only):
-- CREATE TABLE IF NOT EXISTS public.events (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   name text NOT NULL,
--   user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
--   session_id text,
--   ref text,
--   props jsonb NOT NULL DEFAULT '{}'::jsonb,
--   created_at timestamptz NOT NULL DEFAULT now()
-- );
-- ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

SELECT 1; -- no-op marker
