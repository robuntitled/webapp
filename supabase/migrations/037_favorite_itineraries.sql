-- Preferiti sugli itinerari (scheda piano), distinti da favorite_trips.
CREATE TABLE IF NOT EXISTS public.favorite_itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  template_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id)
);

CREATE INDEX IF NOT EXISTS favorite_itineraries_user_id_idx
  ON public.favorite_itineraries (user_id);
