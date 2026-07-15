#!/usr/bin/env node
/**
 * Applica tutte le migration Supabase in ordine (001 → 006).
 * Richiede SUPABASE_DB_URL in .env.local
 */
import { runSqlFile, withPgClient } from './db-utils.mjs';

const MIGRATIONS = [
  'supabase/migrations/001_security_rls.sql',
  'supabase/migrations/002_gdpr_consent.sql',
  'supabase/migrations/003_social_roles_price_watches.sql',
  'supabase/migrations/004_trip_composer.sql',
  'supabase/migrations/005_trip_chat.sql',
  'supabase/migrations/006_planner_profile.sql',
];

await withPgClient(async (client) => {
  for (const file of MIGRATIONS) {
    const name = await runSqlFile(client, file);
    console.log(`✅ ${name}`);
  }
  console.log('');
  console.log('✅ Tutte le migration applicate. Verifica: npm run db:status');
});