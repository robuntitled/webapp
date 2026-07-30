-- Avanzamento job AI (itinerario completo multi-giorno).
-- La UI mostra "Giorno X di Y" durante l'attesa; la colonna è opzionale
-- (il codice scrive in best-effort e continua se manca).

ALTER TABLE public.composer_ai_jobs
  ADD COLUMN IF NOT EXISTS progress jsonb;
