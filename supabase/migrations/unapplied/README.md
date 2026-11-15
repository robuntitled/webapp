# Unapplied migrations (PIANO-FINALE §7 DB-1…15)

**Status: files only — DO NOT apply** without explicit owner approval.

| # | File | Note |
|---|---|---|
| DB-1 | `../049_practice_flight_booking_coverage.sql` | «Pago per altri» — già nel tree migrations/ |
| DB-2 | `../045_practice_flight_bookings.sql` | più biglietti per viaggio |
| DB-3 | `070_db3_practices_archived_deleted.sql` | archived_at / deleted_at |
| DB-4 | `../042` / `../043` reconciliation | review before apply |
| DB-5 | `../044_chat_reports_blocks.sql` | Segnala/Blocca |
| DB-6 | `../050_practice_trip_name_notes.sql` | nome e note viaggio |
| DB-7 | `071_db7_users_age_confirmed_at.sql` | casella 18+ |
| DB-8 | `072_db8_account_delete_anonymize.sql` | anonimizza account |
| DB-9 | `073_db9_events.sql` | misure/UTM (👤) |
| DB-10 | `074_db10_profile_hub_fields.sql` | profilo hub |
| DB-11 | `075_db11_profile_visibility.sql` | privacy profilo |
| DB-12 | `076_db12_editions_slug.sql` | slug partenze |
| DB-13 | *(opzionale)* car_bookings | solo se tieni auto — non creato |
| DB-14 | `077_db14_booking_price_commission.sql` | margini |
| DB-15 | `078_db15_watched_legs_price_alert.sql` | avviso prezzo |

No `SELECT 1` stubs. Duplicate `053_*` removed.
