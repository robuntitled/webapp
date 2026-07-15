#!/usr/bin/env node
/**
 * Esegue un file .sql su Supabase da terminale.
 *
 * Uso:
 *   npm run db:exec -- supabase/RUN_IN_SQL_EDITOR_composer.sql
 *   npm run db:exec -- supabase/migrations/004_trip_composer.sql
 */
import { runSqlFile, withPgClient } from './db-utils.mjs';

const target = process.argv[2];

if (!target) {
  console.error('Uso: npm run db:exec -- <percorso-file.sql>');
  console.error('Es:  npm run db:exec -- supabase/migrations/006_planner_profile.sql');
  process.exit(1);
}

await withPgClient(async (client) => {
  const name = await runSqlFile(client, target);
  console.log(`✅ Eseguito: ${name}`);
});