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
  { label: 'practices', path: 'practices?select=id&limit=0' },
  { label: 'editions', path: 'editions?select=id&limit=0' },
  { label: 'edition_messages', path: 'edition_messages?select=id&limit=0' },
  { label: 'itinerary_templates', path: 'itinerary_templates?select=template_id&limit=0' },
  { label: 'favorite_itineraries', path: 'favorite_itineraries?select=id&limit=0' },
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
