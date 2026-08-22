#!/usr/bin/env node
/**
 * Applica tutte le migration Supabase in ordine (001 → 007).
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
  'supabase/migrations/007_places_search_cache.sql',
  'supabase/migrations/008_places_details_cache.sql',
  'supabase/migrations/009_email_verification.sql',
  'supabase/migrations/010_usernames.sql',
  'supabase/migrations/011_phone_verification.sql',
  'supabase/migrations/012_phone_otp_once.sql',
  'supabase/migrations/013_scale_indexes.sql',
  'supabase/migrations/014_ai_jobs_and_cost_events.sql',
  'supabase/migrations/015_chat_reads_hides.sql',
  'supabase/migrations/016_user_reviews.sql',
  'supabase/migrations/017_trip_invites.sql',
  'supabase/migrations/018_composer_ai_jobs_progress.sql',
  'supabase/migrations/019_trip_join_requests.sql',
  'supabase/migrations/020_user_notifications.sql',
  'supabase/migrations/021_user_posts.sql',
  'supabase/migrations/022_user_map_location.sql',
  'supabase/migrations/023_post_geo.sql',
  'supabase/migrations/024_user_onboarding.sql',
  'supabase/migrations/025_trip_forming.sql',
  'supabase/migrations/026_cashback_ledger.sql',
  'supabase/migrations/027_nomad_points.sql',
  'supabase/migrations/028_points_loyalty.sql',
  'supabase/migrations/030_destinations_templates.sql',
  'supabase/migrations/031_trip_commitments.sql',
  'supabase/migrations/032_practices_editions.sql',
  'supabase/migrations/033_practice_bookings.sql',
  'supabase/migrations/034_edition_chat.sql',
  'supabase/migrations/035_cleanup_creator_trips.sql',
  'supabase/migrations/036_itinerary_templates_normalized.sql',
];

await withPgClient(async (client) => {
  let failed = 0;
  for (const file of MIGRATIONS) {
    try {
      const name = await runSqlFile(client, file);
      console.log(`✅ ${name}`);
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  ${file} — saltata (${message})`);
    }
  }
  console.log('');
  if (failed > 0) {
    console.log(`⚠️  ${failed} migration con errori (spesso già applicate o tabelle di sistema).`);
    console.log('   Verifica: npm run db:status');
    console.log('   Per una sola migration: npm run db:exec -- supabase/migrations/00X_....sql');
  } else {
    console.log('✅ Tutte le migration applicate. Verifica: npm run db:status');
  }
});