-- DB-3 · practices.archived_at / deleted_at (Archivia, ripristino 30 giorni)
-- UNAPPLIED — do not run without explicit owner approval.

ALTER TABLE public.practices
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS practices_archived_at_idx
  ON public.practices (archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS practices_deleted_at_idx
  ON public.practices (deleted_at)
  WHERE deleted_at IS NOT NULL;
