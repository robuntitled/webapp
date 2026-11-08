# Thailand itinerary pilot — provenance

Deterministic planning for **Thailandia only**. Planning output is separate from bookings/payments.
No copyrighted itinerary scrape. AI prose is not route authority.

Checked: **2026-11-08**. Retrievable public pages (no paid API keys).

## License posture

| Source | Use in pilot | License / terms note |
|--------|--------------|----------------------|
| Tourism Authority of Thailand (tourismthailand.org) | Attraction/destination **existence**, official tips cited as facts with URL | Official government tourism site; we cite pages, do not republish long article prose |
| OpenStreetMap / Wikidata city centroids | Area-segment WGS84 anchors already in `lib/itineraries/geo.ts` | [ODbL](https://www.openstreetmap.org/copyright) for OSM-derived data; cite OSM when showing map data |
| Esri / CARTO basemap tiles | Map rendering only (see maps PR) | Tile attribution required on map UI |
| Wikivoyage | **Not ingested** in this pilot | CC BY-SA would require share-alike + attribution; skipped to avoid blind copy |
| Duffel / LiteAPI / hotel rates | **Out of scope** | Live offers only at search time; never baked into itinerary |

## Verified place / area records

| id | Claim used | Source URL | Retrieved |
|----|------------|------------|-----------|
| tat-grand-palace | Grand Palace is a listed Bangkok attraction | https://www.tourismthailand.org/Attraction/the-grand-palace | 2026-11-08 |
| tat-wat-arun | Wat Arun listed; open daily 08:00–17:30 (TAT article) | https://www.tourismthailand.org/Articles/top-5-must-visit-temples-in-bangkok-once-in-a-lifetime | 2026-11-08 |
| tat-chiang-mai | Chiang Mai is an official North destination | https://www.tourismthailand.org/Destinations/Provinces/Chiang-Mai/351 | 2026-11-08 |
| tat-ko-samui | Ko Samui destination (beaches / island hub) | https://www.tourismthailand.org/Destinations/Provinces/Koh-Samui/360 | 2026-11-08 |
| tat-ko-tao | Koh Tao destination; TAT tip: best visit Feb–Apr | https://www.tourismthailand.org/Destinations/Provinces/Ko-Samui/361 (page content: Ko Tao) | 2026-11-08 |
| osm-bangkok | Bangkok area anchor ≈ 13.7563, 100.5018 | OSM/Wikidata city center (ODbL) | 2026-11-08 |
| osm-chiang-mai | Chiang Mai ≈ 18.7883, 98.9853 | OSM/Wikidata | 2026-11-08 |
| osm-koh-samui | Koh Samui ≈ 9.512, 100.0136 | OSM | 2026-11-08 |
| osm-koh-tao | Koh Tao ≈ 10.0956, 99.8381 | OSM | 2026-11-08 |

## Explicit unknowns (must warn, never invent)

- Exact **domestic flight / ferry duration**, price, and timetable between Bangkok ↔ islands / North
- **Bookability** of any hotel zone or paid activity slot
- **Budget totals** beyond existing *budget orientativo* hints on curated templates
- Monsoon / sea conditions beyond the single TAT tip above for Koh Tao seasonality
- Day-by-day street-level POI schedules not listed on TAT pages above

## Curated templates

Day sequences live in `lib/itineraries/thailandia.ts` (catalog). The pilot **selects and remaps** those templates deterministically (`fitItineraryToDays`) and attaches provenance / unknown flags. It does **not** invent new destinations or stop lists.
