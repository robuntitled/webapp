-- DB-10 · Profilo hub: viaggiatori, documenti meta, aeroporto preferito, notifiche
-- UNAPPLIED — do not run without owner approval (+ Legale su documenti).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_origin_iata text,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'companions'
    CHECK (profile_visibility IN ('private', 'companions', 'public'));

CREATE TABLE IF NOT EXISTS public.user_travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date,
  gender text,
  document_type text,
  document_number_enc text,
  document_expiry date,
  document_issue_country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_travelers_user_id_idx
  ON public.user_travelers (user_id);

ALTER TABLE public.user_travelers ENABLE ROW LEVEL SECURITY;
