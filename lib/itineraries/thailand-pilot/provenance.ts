/**
 * Structured provenance for the Thailand deterministic itinerary pilot.
 * Mirror of docs/THAILAND-ITINERARY-PROVENANCE.md — keep in sync.
 */

export type ProvenanceLicense =
  | 'tat-official-cite'
  | 'odbl-osm'
  | 'unknown';

export type ProvenanceRecord = {
  id: string;
  claim: string;
  sourceUrl: string;
  license: ProvenanceLicense;
  retrievedOn: string; // YYYY-MM-DD
  attribution: string;
};

export const PROVENANCE_RETRIEVED_ON = '2026-11-08';

export const THAILAND_PROVENANCE: Record<string, ProvenanceRecord> = {
  'tat-grand-palace': {
    id: 'tat-grand-palace',
    claim: 'Grand Palace is a listed Bangkok attraction (TAT).',
    sourceUrl: 'https://www.tourismthailand.org/Attraction/the-grand-palace',
    license: 'tat-official-cite',
    retrievedOn: PROVENANCE_RETRIEVED_ON,
    attribution: 'Tourism Authority of Thailand',
  },
  'tat-wat-arun': {
    id: 'tat-wat-arun',
    claim: 'Wat Arun listed by TAT; opening hours cited from TAT temples article.',
    sourceUrl:
      'https://www.tourismthailand.org/Articles/top-5-must-visit-temples-in-bangkok-once-in-a-lifetime',
    license: 'tat-official-cite',
    retrievedOn: PROVENANCE_RETRIEVED_ON,
    attribution: 'Tourism Authority of Thailand',
  },
  'tat-chiang-mai': {
    id: 'tat-chiang-mai',
    claim: 'Chiang Mai is an official TAT North destination.',
    sourceUrl: 'https://www.tourismthailand.org/Destinations/Provinces/Chiang-Mai/351',
    license: 'tat-official-cite',
    retrievedOn: PROVENANCE_RETRIEVED_ON,
    attribution: 'Tourism Authority of Thailand',
  },
  'tat-ko-samui': {
    id: 'tat-ko-samui',
    claim: 'Ko Samui is an official TAT island destination.',
    sourceUrl: 'https://www.tourismthailand.org/Destinations/Provinces/Koh-Samui/360',
    license: 'tat-official-cite',
    retrievedOn: PROVENANCE_RETRIEVED_ON,
    attribution: 'Tourism Authority of Thailand',
  },
  'tat-ko-tao': {
    id: 'tat-ko-tao',
    claim: 'Koh Tao destination; TAT tip best visit February–April.',
    sourceUrl: 'https://www.tourismthailand.org/Destinations/Provinces/Ko-Samui/361',
    license: 'tat-official-cite',
    retrievedOn: PROVENANCE_RETRIEVED_ON,
    attribution: 'Tourism Authority of Thailand',
  },
  'osm-bangkok': {
    id: 'osm-bangkok',
    claim: 'Bangkok area-segment map anchor.',
    sourceUrl: 'https://www.openstreetmap.org/copyright',
    license: 'odbl-osm',
    retrievedOn: PROVENANCE_RETRIEVED_ON,
    attribution: '© OpenStreetMap contributors (ODbL)',
  },
  'osm-chiang-mai': {
    id: 'osm-chiang-mai',
    claim: 'Chiang Mai / North area-segment map anchor.',
    sourceUrl: 'https://www.openstreetmap.org/copyright',
    license: 'odbl-osm',
    retrievedOn: PROVENANCE_RETRIEVED_ON,
    attribution: '© OpenStreetMap contributors (ODbL)',
  },
  'osm-koh-samui': {
    id: 'osm-koh-samui',
    claim: 'Koh Samui map anchor.',
    sourceUrl: 'https://www.openstreetmap.org/copyright',
    license: 'odbl-osm',
    retrievedOn: PROVENANCE_RETRIEVED_ON,
    attribution: '© OpenStreetMap contributors (ODbL)',
  },
  'osm-koh-tao': {
    id: 'osm-koh-tao',
    claim: 'Koh Tao map anchor.',
    sourceUrl: 'https://www.openstreetmap.org/copyright',
    license: 'odbl-osm',
    retrievedOn: PROVENANCE_RETRIEVED_ON,
    attribution: '© OpenStreetMap contributors (ODbL)',
  },
};

/** Area segment → coord provenance id (coords themselves live in geo.ts). */
export const AREA_SEGMENT_PROVENANCE_ID: Record<string, string> = {
  bangkok: 'osm-bangkok',
  islands: 'osm-koh-samui',
  north: 'osm-chiang-mai',
  'chiang mai': 'osm-chiang-mai',
  'koh samui': 'osm-koh-samui',
  'koh tao': 'osm-koh-tao',
};

/** POI name fragments → provenance when claim is verified. */
export const POI_PROVENANCE_MATCHERS: Array<{ test: RegExp; provenanceId: string }> = [
  { test: /grand\s*palace/i, provenanceId: 'tat-grand-palace' },
  { test: /wat\s*arun/i, provenanceId: 'tat-wat-arun' },
  { test: /chiang\s*mai|old\s*city/i, provenanceId: 'tat-chiang-mai' },
  { test: /samui/i, provenanceId: 'tat-ko-samui' },
  { test: /tao|snorkel|boat/i, provenanceId: 'tat-ko-tao' },
];

export function provenanceForPoiName(name: string): ProvenanceRecord | null {
  for (const m of POI_PROVENANCE_MATCHERS) {
    if (m.test.test(name)) {
      return THAILAND_PROVENANCE[m.provenanceId] ?? null;
    }
  }
  return null;
}

export function provenanceForAreaSegment(area: string): ProvenanceRecord | null {
  const key = area.trim().toLowerCase();
  const id = AREA_SEGMENT_PROVENANCE_ID[key];
  return id ? THAILAND_PROVENANCE[id] ?? null : null;
}
