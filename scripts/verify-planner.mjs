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
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY mancanti in .env.local');
  process.exit(1);
}

const tables = ['planner_profiles', 'composer_drafts'];

for (const table of tables) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  if (response.ok) {
    console.log(`✅ ${table}: presente`);
  } else if (response.status === 404) {
    console.log(`❌ ${table}: mancante (esegui npm run db:planner)`);
    process.exit(1);
  } else {
    const body = await response.text();
    console.log(`⚠️  ${table}: status ${response.status} — ${body.slice(0, 120)}`);
    process.exit(1);
  }
}

console.log('✅ Tutte le tabelle planner sono pronte.');