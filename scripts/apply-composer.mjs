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
  console.error('In alternativa, esegui 003 e 004 nel SQL Editor di Supabase.');
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/004_trip_composer.sql'),
  'utf8'
);

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log('✅ Migration 004_trip_composer applicata.');
} catch (error) {
  console.error('❌ Errore migration:', error.message);
  process.exit(1);
} finally {
  await client.end();
}