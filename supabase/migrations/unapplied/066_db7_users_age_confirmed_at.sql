-- DB-7 · users.age_confirmed_at (+ versione Termini)
-- UNAPPLIED — do not run without explicit owner approval.
-- PIANO-FINALE §7 / P1-13: casella «Ho almeno 18 anni e accetto i Termini».
--
-- Intended DDL (commented; stub only):
-- ALTER TABLE public.users
--   ADD COLUMN IF NOT EXISTS age_confirmed_at timestamptz,
--   ADD COLUMN IF NOT EXISTS terms_version_accepted text;

SELECT 1; -- no-op marker
