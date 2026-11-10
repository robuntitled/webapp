-- Who pays for whom on a practice's selected flights.
-- FILE ONLY — do NOT apply until owner approves.
--
-- Each entry: one beneficiary (participant seat) covered by a booker.
-- status: pending | booked | covered
--   - pending: selected for a future checkout by coveredByUserId
--   - booked: coveredByUserId completed checkout for this beneficiary
--   - covered: synonym used when beneficiary != booker (UI: «Pagato da X»)

ALTER TABLE practices
  ADD COLUMN IF NOT EXISTS flight_booking_coverage jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN practices.flight_booking_coverage IS
  'Array of { beneficiaryUserId, coveredByUserId, status, bookingId?, updatedAt }. Soft until applied; not a payment ledger.';
