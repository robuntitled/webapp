-- Cache condivisa ricerche Google Places (tutti gli utenti).
-- Usata da /api/places/google-search per ridurre chiamate billable.

create table if not exists public.places_search_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  lat numeric(9, 3) not null,
  lng numeric(9, 3) not null,
  category text not null,
  query text not null default '',
  language text not null default 'it',
  results jsonb not null default '[]'::jsonb,
  hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists places_search_cache_updated_at_idx
  on public.places_search_cache (updated_at desc);

create index if not exists places_search_cache_zone_cat_idx
  on public.places_search_cache (lat, lng, category);

comment on table public.places_search_cache is
  'Risultati Places condivisi tra tutti gli utenti: chiave zona+categoria+query. Nessuna scadenza in app.';

-- Solo service role (API server). Nessun accesso client anon.
alter table public.places_search_cache enable row level security;

revoke all on public.places_search_cache from anon, authenticated;

-- Nessuna policy pubblica: RLS on + zero policy = deny per anon/authenticated.
-- supabaseAdmin (service_role) bypassa RLS.
