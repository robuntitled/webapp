import { runSqlFile, withPgClient } from './db-utils.mjs';

await withPgClient(async (client) => {
  const name = await runSqlFile(client, 'supabase/migrations/003_social_roles_price_watches.sql');
  console.log(`✅ Migration ${name} applicata.`);
});