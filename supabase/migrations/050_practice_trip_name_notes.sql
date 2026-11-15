-- 050: Nome del viaggio + Note sulla pratica (dashboard I miei viaggi).
-- SCRIVERE QUI / NON APPLICARE in questo task: riportare all'owner.
-- Backward compatible: colonne nullable; UI soft-fail se assenti.

alter table public.practices
  add column if not exists trip_name text;

alter table public.practices
  add column if not exists trip_notes text;

comment on column public.practices.trip_name is
  'Nome personalizzato del viaggio (opzionale). Se null si usa destinazione / edition.title.';

comment on column public.practices.trip_notes is
  'Note libere del viaggio (visibili ai partecipanti). Non sostituiscono documenti di viaggio.';

-- Opzionale: limite soft via check (solo se vuoi vincolare in DB).
-- alter table public.practices
--   add constraint practices_trip_name_len check (trip_name is null or char_length(trip_name) <= 80);
-- alter table public.practices
--   add constraint practices_trip_notes_len check (trip_notes is null or char_length(trip_notes) <= 2000);
