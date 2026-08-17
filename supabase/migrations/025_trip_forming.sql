-- Stato “in formazione” + conferma gruppo (architettura flussi).
-- Applica con: npm run db:exec -- supabase/migrations/025_trip_forming.sql

ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;

ALTER TABLE trips
  ADD CONSTRAINT trips_status_check
  CHECK (status IN ('draft', 'forming', 'confirmed', 'published', 'archived'));
