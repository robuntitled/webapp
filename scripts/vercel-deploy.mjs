#!/usr/bin/env node
/**
 * Configura env Travelpayouts su Vercel e lancia deploy production.
 *
 * Prerequisito (una tantum):
 *   npx vercel login
 *   oppure: export VERCEL_TOKEN=...
 *
 * Uso:
 *   node scripts/vercel-deploy.mjs
 *   TRAVELPAYOUTS_API_TOKEN=xxx node scripts/vercel-deploy.mjs
 */

import { spawnSync } from 'node:child_process';

const MARKER = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER || '748861';
const ORIGIN = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA || 'ROM';
const API_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN?.trim();

function run(cmd, args, input) {
  const result = spawnSync(cmd, args, {
    stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    input,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function upsertEnv(name, value, type = 'plain') {
  console.log(`\n→ ${name}`);
  run('npx', ['vercel', 'env', 'rm', name, 'production', '-y'], null);
  run('npx', ['vercel', 'env', 'add', name, 'production', '--force'], `${value}\n`);
  if (type === 'sensitive') {
    run('npx', ['vercel', 'env', 'add', name, 'preview', '--force'], `${value}\n`);
    run('npx', ['vercel', 'env', 'add', name, 'development', '--force'], `${value}\n`);
  }
}

console.log('NomadLink — setup Vercel + deploy production\n');

run('npx', ['vercel', 'link', '--yes', '--project', 'webapp']);

upsertEnv('NEXT_PUBLIC_TRAVELPAYOUTS_MARKER', MARKER);
upsertEnv('NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA', ORIGIN);

if (API_TOKEN) {
  upsertEnv('TRAVELPAYOUTS_API_TOKEN', API_TOKEN, 'sensitive');
} else {
  console.log('\n⚠ TRAVELPAYOUTS_API_TOKEN non impostato — stime prezzo disabilitate');
}

console.log('\n→ Deploy production…');
run('npx', ['vercel', 'deploy', '--prod', '--yes']);

console.log('\n✓ Fatto. Test:');
console.log(
  '  https://webapp-bice-six-42.vercel.app/api/travel/links?destination=Thailandia&startDate=2026-08-01&endDate=2026-08-15'
);