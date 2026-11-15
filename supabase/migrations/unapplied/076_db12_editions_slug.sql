-- DB-12 · editions.slug + updated_at affidabile (URL leggibili) — opzionale
-- UNAPPLIED — do not run without owner approval.

ALTER TABLE public.editions
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS editions_slug_unique_idx
  ON public.editions (slug)
  WHERE slug IS NOT NULL;
