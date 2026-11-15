-- DB-11 · Interruttore visibilità profilo (PRO-5) — opzionale
-- UNAPPLIED — do not run without owner approval.
-- Column also introduced in 074_db10; this file is a no-op if 074 already applied.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'companions';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_profile_visibility_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_profile_visibility_check
      CHECK (profile_visibility IN ('private', 'companions', 'public'));
  END IF;
END $$;
