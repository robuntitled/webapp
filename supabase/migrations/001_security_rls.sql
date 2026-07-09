-- NomadLink security hardening (NextAuth + Supabase, NO Supabase Auth)
-- Applica con: npm run db:security
-- Richiede SUPABASE_DB_URL in .env.local (Supabase → Settings → Database → URI)

-- ── Tabelle applicative ──────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

-- Rimuovi policy vecchie (se esistono)
DROP POLICY IF EXISTS "trips_select_public" ON trips;
DROP POLICY IF EXISTS "trips_insert_own" ON trips;
DROP POLICY IF EXISTS "trips_update_own" ON trips;
DROP POLICY IF EXISTS "trips_delete_own" ON trips;
DROP POLICY IF EXISTS "favorites_select_own" ON favorite_trips;
DROP POLICY IF EXISTS "favorites_insert_own" ON favorite_trips;
DROP POLICY IF EXISTS "favorites_delete_own" ON favorite_trips;
DROP POLICY IF EXISTS "participants_select_public" ON trip_participants;
DROP POLICY IF EXISTS "participants_insert_own" ON trip_participants;
DROP POLICY IF EXISTS "users_select_public" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "anon_read_trips" ON trips;
DROP POLICY IF EXISTS "anon_read_participants" ON trip_participants;

-- Revoca permessi pericolosi ai ruoli pubblici
REVOKE ALL ON users FROM anon, authenticated;
REVOKE ALL ON favorite_trips FROM anon, authenticated;
REVOKE ALL ON trip_participants FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON trips FROM anon, authenticated;

-- Consenti solo lettura pubblica di viaggi e partecipanti (necessario per le policy RLS)
GRANT SELECT ON trips TO anon, authenticated;
GRANT SELECT ON trip_participants TO anon, authenticated;

-- Vista pubblica per nomi organizzatori (senza email, password, telefono)
CREATE OR REPLACE VIEW public_trip_creators AS
  SELECT id, first_name, last_name, image FROM users;

REVOKE ALL ON public_trip_creators FROM PUBLIC;
GRANT SELECT ON public_trip_creators TO anon, authenticated;

-- Policy RLS: lettura pubblica viaggi
CREATE POLICY "anon_read_trips"
  ON trips FOR SELECT TO anon, authenticated
  USING (true);

-- Policy RLS: lettura pubblica partecipanti (per stato iscrizione)
CREATE POLICY "anon_read_participants"
  ON trip_participants FOR SELECT TO anon, authenticated
  USING (true);

-- users e favorite_trips: NESSUNA policy → accesso negato ad anon/authenticated
-- Le server actions usano service_role (bypass RLS) dopo verifica NextAuth

-- ── Storage avatars ──────────────────────────────────────────────────────────

-- Abilita RLS su storage (se non già attivo)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_no_public_write" ON storage.objects;

-- Chiunque può vedere gli avatar (bucket pubblico in lettura)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

-- Nessuna scrittura diretta da anon/authenticated (upload solo via service_role)
-- (assenza di policy INSERT/UPDATE/DELETE = negato)