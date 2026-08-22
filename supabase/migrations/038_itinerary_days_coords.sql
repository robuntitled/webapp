-- Lat/lng per giorno di itinerario (posizioni mappa locale).
ALTER TABLE public.itinerary_days
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

COMMENT ON COLUMN public.itinerary_days.lat IS 'Latitudine tappa (WGS84)';
COMMENT ON COLUMN public.itinerary_days.lng IS 'Longitudine tappa (WGS84)';
