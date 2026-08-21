-- Posto provvisorio vs confermato (volo), hotel gruppo.

ALTER TABLE trip_participants
  ADD COLUMN IF NOT EXISTS seat_status text NOT NULL DEFAULT 'provisional',
  ADD COLUMN IF NOT EXISTS flight_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS flight_booking_ref text,
  ADD COLUMN IF NOT EXISTS hotel_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS hotel_matches_group boolean NOT NULL DEFAULT false;

ALTER TABLE trip_participants DROP CONSTRAINT IF EXISTS trip_participants_seat_status_check;
ALTER TABLE trip_participants
  ADD CONSTRAINT trip_participants_seat_status_check
  CHECK (seat_status IN ('provisional', 'confirmed'));

CREATE INDEX IF NOT EXISTS trip_participants_flight_confirmed_idx
  ON trip_participants (trip_id)
  WHERE seat_status = 'confirmed';
