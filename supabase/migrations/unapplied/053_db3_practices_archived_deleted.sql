-- DB-3 · practices.archived_at / deleted_at + stato Archiviato
-- UNAPPLIED — do not run without explicit owner approval.
-- PIANO-FINALE §7: serve per dialog Archivia / ripristino 30 giorni.
--
-- Intended DDL (commented; stub only):
-- ALTER TABLE public.practices
--   ADD COLUMN IF NOT EXISTS archived_at timestamptz,
--   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- CREATE INDEX IF NOT EXISTS practices_archived_at_idx ON public.practices (archived_at)
--   WHERE archived_at IS NOT NULL;
-- CREATE INDEX IF NOT EXISTS practices_deleted_at_idx ON public.practices (deleted_at)
--   WHERE deleted_at IS NOT NULL;

SELECT 1; -- no-op marker
