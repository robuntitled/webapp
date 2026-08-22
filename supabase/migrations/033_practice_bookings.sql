-- Recap prenotazioni sulla pratica (voli / hotel / Viator).

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS flight_booking jsonb,
  ADD COLUMN IF NOT EXISTS hotel_bookings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS activity_bookings jsonb NOT NULL DEFAULT '[]'::jsonb;
