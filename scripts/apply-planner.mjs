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

const env = loadEnv();
const connectionString = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ SUPABASE_DB_URL mancante in .env.local');
  console.error('');
  console.error('Supabase Dashboard → Project Settings → Database → Connection string → URI');
  console.error('Usa la password del database (non la service role key).');
  console.error('');
  console.error('Aggiungi in .env.local:');
  console.error('SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@...');
  console.error('');
  console.error('In alternativa, incolla supabase/migrations/006_planner_profile.sql nel SQL Editor.');
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/006_planner_profile.sql'),
  'utf8'
);

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log('✅ Migration 006_planner_profile applicata.');
} catch (error) {
  console.error('❌ Errore migration:', error.message);
  process.exit(1);
} finally {
  await client.end();
}