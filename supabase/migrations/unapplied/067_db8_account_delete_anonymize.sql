-- DB-8 · Anonimizzazione prenotazioni alla cancellazione account
-- UNAPPLIED — do not run without explicit owner approval.
-- PIANO-FINALE §7 / P1-12: non promettere di cancellare le prenotazioni fornitori.
--
-- Intended: soft-null PII on users; keep booking rows with user_id null / anonymized;
-- chat messages → «messaggio eliminato»; transfer creator role before delete.

SELECT 1; -- no-op marker
