-- Cache dettagli luogo (rating + foto) condivisa, senza scadenza.
-- place_id Google Places (New), es. "places/ChIJ..."

create table if not exists public.places_details_cache (
  place_id text primary key,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  rating numeric(3, 2),
  rating_count integer,
  photo_name text,
  primary_type text,
  hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists places_details_cache_updated_at_idx
  on public.places_details_cache (updated_at desc);

comment on table public.places_details_cache is
  'Dettagli Places (rating, photo resource) condivisi tra utenti. Nessuna scadenza.';

alter table public.places_details_cache enable row level security;
revoke all on public.places_details_cache from anon, authenticated;
