#!/usr/bin/env node
/**
 * Configura env LiteAPI su Vercel e lancia deploy production.
 *
 * Prerequisito (una tantum):
 *   npx vercel login
 *   oppure: export VERCEL_TOKEN=...
 *
 * Uso:
 *   LITEAPI_KEY=xxx node scripts/vercel-deploy.mjs
 */

import { spawnSync } from 'node:child_process';

const LITEAPI_KEY = process.env.LITEAPI_KEY?.trim() || process.env.LITE_API_KEY?.trim();
const ORIGIN = process.env.NEXT_PUBLIC_DEFAULT_ORIGIN_IATA || 'ROM';
const MARGIN = process.env.LITEAPI_MARGIN?.trim() || '10';

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

function upsertEnv(name, value) {
  console.log(`\n→ ${name}`);
  run('npx', ['vercel', 'env', 'rm', name, 'production', '-y'], null);
  run('npx', ['vercel', 'env', 'add', name, 'production', '--force'], `${value}\n`);
  run('npx', ['vercel', 'env', 'add', name, 'preview', '--force'], `${value}\n`);
  run('npx', ['vercel', 'env', 'add', name, 'development', '--force'], `${value}\n`);
}

console.log('NomadLink — setup Vercel LiteAPI + deploy production\n');

run('npx', ['vercel', 'link', '--yes', '--project', 'webapp']);

upsertEnv('NEXT_PUBLIC_DEFAULT_ORIGIN_IATA', ORIGIN);
upsertEnv('LITEAPI_MARGIN', MARGIN);

if (LITEAPI_KEY) {
  upsertEnv('LITEAPI_KEY', LITEAPI_KEY);
} else {
  console.log('\n⚠ LITEAPI_KEY non impostata — hotel/voli disabilitati');
}

console.log('\n→ Deploy production…');
run('npx', ['vercel', 'deploy', '--prod', '--yes']);

console.log('\n✓ Fatto. Test:');
console.log(
  '  /api/liteapi/hotels/search?cityName=Rome&countryCode=IT&checkin=2026-08-01&checkout=2026-08-05'
);
console.log(
  '  /api/liteapi/flights/search?destination=Parigi&startDate=2026-08-01&endDate=2026-08-08&originIata=ROM'
);
