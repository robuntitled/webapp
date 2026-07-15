#!/usr/bin/env node
/**
 * Verifica rapida schema Supabase (REST + service key).
 */
import { loadEnv } from './db-utils.mjs';

const env = loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY mancanti in .env.local');
  process.exit(1);
}

const checks = [
  { label: 'trips.composer_version', path: 'trips?select=composer_version,planning_mode,status&limit=0' },
  { label: 'trip_participants.role', path: 'trip_participants?select=role&limit=0' },
  { label: 'trip_days', path: 'trip_days?select=*&limit=0' },
  { label: 'trip_blocks', path: 'trip_blocks?select=*&limit=0' },
  { label: 'trip_chat (005)', path: 'trip_messages?select=*&limit=0' },
  { label: 'planner_profiles', path: 'planner_profiles?select=*&limit=0' },
  { label: 'composer_drafts', path: 'composer_drafts?select=*&limit=0' },
];

let failed = false;

for (const check of checks) {
  const response = await fetch(`${url}/rest/v1/${check.path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  if (response.ok) {
    console.log(`✅ ${check.label}`);
  } else {
    const body = await response.text();
    console.log(`❌ ${check.label} — ${body.slice(0, 100)}`);
    failed = true;
  }
}

if (failed) {
  console.error('');
  console.error('Schema incompleto → npm run db:apply-all  (serve SUPABASE_DB_URL)');
  process.exit(1);
}

console.log('');
console.log('✅ Schema OK');