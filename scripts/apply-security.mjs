#!/usr/bin/env node
/**
 * Applica le policy di sicurezza RLS su Supabase.
 * Richiede SUPABASE_DB_URL in .env.local
 * (Supabase Dashboard → Project Settings → Database → Connection string → URI)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

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
  const dbUrl = env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.error('❌ SUPABASE_DB_URL mancante in .env.local');
    console.error('');
    console.error('Aggiungi la connection string PostgreSQL:');
    console.error('Supabase Dashboard → Settings → Database → Connection string → URI');
    console.error('');
    console.error('Oppure incolla manualmente supabase/migrations/001_security_rls.sql');
    console.error('nel SQL Editor di Supabase.');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_security_rls.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('🔒 Applicazione policy di sicurezza...');
    await client.query(sql);
    console.log('✅ RLS applicato con successo!');
    console.log('');
    console.log('Verifica: la chiave anon NON può più leggere users né modificare trips.');
  } catch (error) {
    console.error('❌ Errore applicazione RLS:', error.message);
    console.error('');
    console.error('Alternativa: copia supabase/migrations/001_security_rls.sql');
    console.error('nel SQL Editor di Supabase e eseguilo manualmente.');
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();