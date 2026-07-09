import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ SUPABASE_DB_URL mancante in .env.local');
  process.exit(1);
}

const sql = readFileSync(join(__dirname, '../supabase/migrations/005_trip_chat.sql'), 'utf8');

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log('✅ Migration 005_trip_chat applicata.');
} catch (error) {
  console.error('❌ Errore migration:', error.message);
  process.exit(1);
} finally {
  await client.end();
}