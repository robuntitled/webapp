# Itinerari ufficiali (bundle JSON)

- `americas-v1.json.gz` — 99 template (11 destinazioni Americhe × 3 stili × 3 durate).
- Import DB: `npm run db:itineraries`
- Schema: `supabase/migrations/036_itinerary_templates_normalized.sql`
- Lettura app: `lib/data/itinerary-templates.ts` (wizard published resta Thailandia)

## Tabelle

| Tabella | Contenuto |
|---------|-----------|
| `itinerary_templates` | Meta + `source_payload` completo + `content_text` FTS |
| `itinerary_days` / `itinerary_pois` | Giorni e POI |
| `itinerary_hotels` / `itinerary_paid_activities` | Soggiorni e attività |
| `itinerary_links` | Link risolvibili (voli/hotel/auto/mappe) con bindings |
| `itinerary_rag_chunks` | Stub RAG — embedding in sospeso |

`giamaica` nel JSON sorgente è mappato a `jamaica` del catalogo.
