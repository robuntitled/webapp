#!/usr/bin/env node
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
    console.error('In alternativa, esegui supabase/migrations/002_gdpr_consent.sql nel SQL Editor.');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_gdpr_consent.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Migration GDPR applicata.');
  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();