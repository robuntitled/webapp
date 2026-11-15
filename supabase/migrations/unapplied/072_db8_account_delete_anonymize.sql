-- DB-8 · Supporto anonimizzazione account (P1-12)
-- UNAPPLIED — do not run without explicit owner approval + Legale/commercialista.
-- Prenotazioni restano nei sistemi fornitori; PII utente annullata.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymize_reason text;

-- Helper flag for soft-deleted chat content (application writes «messaggio eliminato»).
-- No DROP of booking rows: keep supplier references with user_id nulled by app logic.
