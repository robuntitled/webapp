-- 039: drop schema leftover from retired features
-- Cashback %, price watches, unused travel quote cache, legacy trip chat,
-- unused trip_templates compat table, unused RAG chunks, legacy favorite_trips.

DROP TABLE IF EXISTS cashback_ledger CASCADE;
DROP TABLE IF EXISTS price_watches CASCADE;
DROP TABLE IF EXISTS travel_quotes CASCADE;
DROP TABLE IF EXISTS trip_chat_reads CASCADE;
DROP TABLE IF EXISTS trip_chat_hides CASCADE;
DROP TABLE IF EXISTS trip_messages CASCADE;
DROP TABLE IF EXISTS trip_templates CASCADE;
DROP TABLE IF EXISTS itinerary_rag_chunks CASCADE;
DROP TABLE IF EXISTS favorite_trips CASCADE;
