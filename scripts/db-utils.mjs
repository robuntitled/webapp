import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

export function loadEnv() {
  const envPath = path.join(ROOT, '.env.local');
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

export function getDbUrl() {
  const env = loadEnv();
  return process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL || null;
}

export function printDbUrlHelp() {
  console.error('❌ SUPABASE_DB_URL mancante in .env.local');
  console.error('');
  console.error('1. Supabase Dashboard → Settings → Database');
  console.error('2. Connection string → URI (Session pooler o Direct)');
  console.error('3. Sostituisci [YOUR-PASSWORD] con la password del database Postgres');
  console.error('4. Aggiungi in .env.local:');
  console.error('   SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@...');
  console.error('');
  console.error('Poi: npm run db:apply-all   oppure   npm run db:exec -- file.sql');
}

export async function withPgClient(fn) {
  const connectionString = getDbUrl();
  if (!connectionString) {
    printDbUrlHelp();
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function runSqlFile(client, relativePath) {
  const fullPath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(ROOT, relativePath);
  const sql = fs.readFileSync(fullPath, 'utf8');
  await client.query(sql);
  return path.basename(fullPath);
}