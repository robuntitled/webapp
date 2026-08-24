#!/usr/bin/env node
/**
 * Bootstrap produzione: applica tutte le migration Supabase in ordine.
 *
 * Uso (una sola volta o dopo ogni deploy con nuove migration):
 *   SUPABASE_DB_URL=postgresql://... npm run db:bootstrap-prod
 *
 * Richiede SUPABASE_DB_URL (connection string Postgres, non la REST key).
 * Dopo l'apply esegue npm run db:status per verificare lo schema.
 */
import { spawn } from 'node:child_process';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
    });
  });
}

const dbUrl = process.env.SUPABASE_DB_URL?.trim();
if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL mancante.');
  console.error('   Esporta la connection string Postgres da Supabase → Settings → Database.');
  console.error('   Poi: SUPABASE_DB_URL=... npm run db:bootstrap-prod');
  process.exit(1);
}

console.log('🚀 NomadLink DB bootstrap produzione\n');

try {
  await run('node', ['scripts/db-apply-all.mjs']);
  console.log('\n📋 Verifica schema…\n');
  await run('npm', ['run', 'db:status']);
  console.log('\n✅ Bootstrap completato.');
} catch (err) {
  console.error('\n❌ Bootstrap fallito:', err instanceof Error ? err.message : err);
  process.exit(1);
}
