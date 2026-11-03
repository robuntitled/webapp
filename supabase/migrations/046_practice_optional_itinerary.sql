-- M2 (Fase 1): itinerario/template facoltativo + tratte pianificate (intenzioni, non offerte).
-- File di migrazione presente nel repo: NON applicare automaticamente.
-- Usare solo dopo review owner (db:exec / bootstrap esplicito).
--
-- Permette di creare un viaggio dalla ricerca voli/hotel anche senza template pubblicato.
-- planned_legs salva solo origine/destinazione/date (mai offerte bloccate in attesa di pagamento).

ALTER TABLE practices
  ALTER COLUMN template_id DROP NOT NULL;

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS planned_legs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS destination_label text,
  ADD COLUMN IF NOT EXISTS destination_iata text;

COMMENT ON COLUMN practices.template_id IS
  'M2: facoltativo. Null o viaggio-libero = viaggio senza itinerario template.';
COMMENT ON COLUMN practices.planned_legs IS
  'M2: tratte pianificate (intenzioni: origin, destination, date). Non sono offerte prenotabili.';
COMMENT ON COLUMN practices.destination_label IS
  'M2: etichetta meta libera (es. città/paese) quando manca un template.';
COMMENT ON COLUMN practices.destination_iata IS
  'M2: codice IATA hub di arrivo quando il viaggio nasce da un volo.';
