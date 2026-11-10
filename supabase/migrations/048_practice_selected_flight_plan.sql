-- Selected Organizza flight plan (offer snapshots per leg) on a practice.
-- Renumbered from 047 → 048 to avoid clash with 047_rls_lockdown.sql.
-- Owner applied this column on Supabase (2026-11-10); IF NOT EXISTS is safe.
-- Do NOT re-apply automatically.
--
-- Stores the Voli-step selections so «Acquista i voli» can reopen checkout
-- for the same legs without a new search. Not a paid booking.

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS selected_flight_plan jsonb;

COMMENT ON COLUMN practices.selected_flight_plan IS
  'Organizza Voli: TripFlightPlan-like JSON (legs + offer snapshots). Intentions until checkout; not a confirmed booking.';
