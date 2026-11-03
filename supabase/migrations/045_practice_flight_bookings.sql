-- M1 (Fase 1): lista voli per pratica.
-- File di migrazione presente nel repo: NON applicare automaticamente.
-- Usare solo dopo review owner (db:exec / bootstrap esplicito).
--
-- Prima: practices.flight_booking (jsonb singolo) — un secondo volo sovrascriveva il primo.
-- Dopo: practices.flight_bookings (jsonb array) + backfill dal campo legacy.
-- Il campo flight_booking resta come "primario" (primo elemento) per compatibilità lettura.

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS flight_bookings jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: se c'è un flight_booking e la lista è vuota, copialo.
UPDATE practices
SET flight_bookings = jsonb_build_array(flight_booking)
WHERE flight_booking IS NOT NULL
  AND (
    flight_bookings IS NULL
    OR flight_bookings = '[]'::jsonb
  );

COMMENT ON COLUMN practices.flight_bookings IS
  'M1: elenco prenotazioni volo (FlightBookingRecap[]). flight_booking resta lo snapshot del primo per compatibilità.';
