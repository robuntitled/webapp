#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY mancanti');
  process.exit(1);
}

let failed = false;

async function check(label, path) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (response.ok) {
    console.log(`✅ ${label}`);
    return;
  }
  const body = await response.text();
  console.log(`❌ ${label} — ${body.slice(0, 120)}`);
  failed = true;
}

await check('trips.composer_version', 'trips?select=composer_version,status,planning_mode&limit=0');
await check('trip_participants.role', 'trip_participants?select=role&limit=0');
await check('trip_days', 'trip_days?select=*&limit=0');
await check('trip_blocks', 'trip_blocks?select=*&limit=0');

if (failed) {
  console.error('');
  console.error('Esegui nel SQL Editor (in ordine):');
  console.error('  1. supabase/migrations/003_social_roles_price_watches.sql');
  console.error('  2. supabase/migrations/004_trip_composer.sql');
  process.exit(1);
}

console.log('✅ Schema composer pronto per pubblicare viaggi.');