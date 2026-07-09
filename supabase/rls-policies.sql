-- Politiche RLS consigliate per NomadLink.
-- Esegui queste query nel SQL Editor di Supabase quando sei pronto
-- per ridurre l'uso della service key nelle server actions.

-- Abilita RLS sulle tabelle
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

-- Trips: lettura pubblica, scrittura solo dal creatore
CREATE POLICY "trips_select_public" ON trips FOR SELECT USING (true);
CREATE POLICY "trips_insert_own" ON trips FOR INSERT WITH CHECK (auth.uid()::text = creator_id);
CREATE POLICY "trips_update_own" ON trips FOR UPDATE USING (auth.uid()::text = creator_id);
CREATE POLICY "trips_delete_own" ON trips FOR DELETE USING (auth.uid()::text = creator_id);

-- Preferiti: solo il proprietario
CREATE POLICY "favorites_select_own" ON favorite_trips FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "favorites_insert_own" ON favorite_trips FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "favorites_delete_own" ON favorite_trips FOR DELETE USING (auth.uid()::text = user_id);

-- Partecipanti: lettura pubblica, iscrizione solo per sé stessi
CREATE POLICY "participants_select_public" ON trip_participants FOR SELECT USING (true);
CREATE POLICY "participants_insert_own" ON trip_participants FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Utenti: lettura profilo pubblico, modifica solo del proprio
CREATE POLICY "users_select_public" ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid()::text = id);