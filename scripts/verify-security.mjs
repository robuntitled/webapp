#!/usr/bin/env node
/**
 * Verifica che la chiave anon non possa accedere a dati sensibili.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL o ANON_KEY mancanti in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, anonKey);
  let failed = false;

  const { data: users, error: usersError } = await supabase.from('users').select('id').limit(1);
  if (!usersError && users?.length) {
    console.error('❌ CRITICO: anon può leggere la tabella users');
    failed = true;
  } else {
    console.log('✅ users: accesso negato ad anon');
  }

  const { error: insertError } = await supabase
    .from('trips')
    .insert({ title: 'test-hack', destination: 'x', creator_id: '00000000-0000-0000-0000-000000000000' });
  if (!insertError) {
    console.error('❌ CRITICO: anon può inserire trips');
    failed = true;
  } else {
    console.log('✅ trips INSERT: negato ad anon');
  }

  const { data: trips, error: tripsError } = await supabase.from('trips').select('id').limit(1);
  if (tripsError) {
    console.error('⚠️  trips SELECT fallito (potrebbe essere intenzionale):', tripsError.message);
  } else {
    console.log(`✅ trips SELECT: consentito (${trips?.length ?? 0} righe visibili)`);
  }

  const { data: favorites, error: favError } = await supabase
    .from('favorite_trips')
    .select('trip_id')
    .limit(1);
  if (!favError && favorites?.length) {
    console.error('❌ CRITICO: anon può leggere favorite_trips');
    failed = true;
  } else {
    console.log('✅ favorite_trips: accesso negato ad anon');
  }

  if (failed) {
    console.error('');
    console.error('Esegui: npm run db:security (dopo aver aggiunto SUPABASE_DB_URL)');
    process.exit(1);
  }

  console.log('');
  console.log('🔒 Verifica completata: il database è protetto.');
}

main();