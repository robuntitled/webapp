-- Titolo opzionale per edizione (viaggio privato / partenza).
-- Default null → UI usa destination_name del template.
-- NON applicare in produzione da questo agent: segnalare al proprietario.

ALTER TABLE editions
  ADD COLUMN IF NOT EXISTS title text;

COMMENT ON COLUMN editions.title IS
  'Nome opzionale del viaggio; se null si mostra la destinazione del template.';
