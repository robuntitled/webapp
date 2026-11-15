-- DB-7 · users.age_confirmed_at (+ versione Termini accettata)
-- UNAPPLIED — do not run without explicit owner approval.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS age_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version_accepted text;
