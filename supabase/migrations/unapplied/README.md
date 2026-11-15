# Unapplied migrations (DB-1 … DB-15) — from PIANO-FINALE §7

**Status: files only — DO NOT apply** without explicit owner approval.

Existing numbered migrations in `supabase/migrations/` that map to PIANO IDs stay there;
stubs below are no-ops (`SELECT 1`) until owner approves real DDL.

| # | File / note | Serve per | Stato |
|---|---|---|---|
| DB-1 | `../049_practice_flight_booking_coverage.sql` (+ `051_db1_…`) | «Pago per altri» | non applicata |
| DB-2 | `../045_practice_flight_bookings.sql` (+ `052_db2_…`) | più biglietti per viaggio | verificare in prod |
| DB-3 | `053_db3_practices_archived_deleted.sql` | Archivia / deleted_at | stub |
| DB-4 | `../042`/`043` reconciliation (+ `052`) | pagato ma non salvato | review before apply |
| DB-5 | `../044_chat_reports_blocks.sql` (+ `057`) | Segnala/Blocca | verificare |
| DB-6 | `../050_practice_trip_name_notes.sql` | nome e note | non applicata |
| DB-7 | `066_db7_users_age_confirmed_at.sql` (+ `054`) | casella 18+ | stub |
| DB-8 | `067_db8_account_delete_anonymize.sql` | elimina account | stub |
| DB-9 | `068_db9_events.sql` | misure/UTM | stub (👤) |
| DB-10 | `069_db10_profile_hub_fields.sql` (+ `056`) | profilo hub | stub |
| DB-11 | `056` visibility / profile fields | privacy PRO-5 | stub opzionale |
| DB-12 | editions.slug stub (`064`/`065` related) | URL leggibili | stub opzionale |
| DB-13 | car_bookings (solo se tieni auto) | auto | stub opzionale |
| DB-14 | server-side price/commission | margini | stub |
| DB-15 | watched legs price alert | motivi per tornare | stub |

Legacy stub filenames `053_db3_creator_transfer_audit.sql` … `065_…` remain as historical no-ops.
