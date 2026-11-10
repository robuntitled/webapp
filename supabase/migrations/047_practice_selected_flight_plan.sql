-- Selected Organizza flight plan (offer snapshots per leg) on a practice.
-- File only: do NOT apply automatically. Owner review required.
--
-- Stores the Voli-step selections so «Acquista i voli» can reopen checkout
-- for the same legs without a new search. Not a paid booking.

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS selected_flight_plan jsonb;

COMMENT ON COLUMN practices.selected_flight_plan IS
  'Organizza Voli: TripFlightPlan-like JSON (legs + offer snapshots). Intentions until checkout; not a confirmed booking.';
