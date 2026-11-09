/**
 * Curated multi-country combinations — only verified classic pairs.
 * Safer UX: non-curated pairs are not offered in Organizza.
 *
 * Transfer sources: Wikivoyage «Get in» / official transport pages.
 * Retrieved 2026-11-09. Costs are mid estimates, not live fares.
 */

import type { CuratedMultiCountryPair } from '@/lib/itineraries/multi-country/types';

const ON = '2026-11-09';
const WV = 'https://en.wikivoyage.org/wiki';

export const CURATED_MULTI_COUNTRY_PAIRS: CuratedMultiCountryPair[] = [
  {
    id: 'thailandia-cambogia',
    slugs: ['thailandia', 'cambogia'],
    titleIt: 'Thailandia + Cambogia',
    blurbIt: 'Bangkok e isole/nord, poi Siem Reap (Angkor). Open-jaw tipico BKK→REP.',
    arrivalHubIata: 'BKK',
    departureHubIata: 'REP',
    transfer: {
      fromSlug: 'thailandia',
      toSlug: 'cambogia',
      mode: 'internal_flight',
      durationHours: 1.2,
      verified: true,
      costEurPerPerson: 70,
      notesIt: 'Volo regionale Bangkok↔Siem Reap (alternativa terra Poipet da verificare).',
      sourceLabelIt: 'Wikivoyage Cambodia — Get in',
      sourceUrl: `${WV}/Cambodia#Get_in`,
      retrievedOn: ON,
    },
    openJawFlightEur: {
      low: 650,
      mid: 820,
      high: 1100,
      sourceLabelIt: 'Wikivoyage Thailand / Cambodia — Getting there (Europe)',
      sourceUrl: `${WV}/Thailand#Get_in`,
      retrievedOn: ON,
    },
  },
  {
    id: 'vietnam-cambogia',
    slugs: ['vietnam', 'cambogia'],
    titleIt: 'Vietnam + Cambogia',
    blurbIt:
      'Nord→sud Vietnam (arrivo HAN), poi volo SGN→REP per Angkor; rientro da Siem Reap.',
    arrivalHubIata: 'HAN',
    departureHubIata: 'REP',
    transfer: {
      fromSlug: 'vietnam',
      toSlug: 'cambogia',
      mode: 'internal_flight',
      durationHours: 1.2,
      verified: true,
      costEurPerPerson: 65,
      notesIt:
        'Volo regionale Ho Chi Minh (SGN) → Siem Reap (REP), allineato all’open-jaw HAN→REP.',
      sourceLabelIt: 'Wikivoyage Siem Reap — Get in',
      sourceUrl: `${WV}/Siem_Reap#Get_in`,
      retrievedOn: ON,
    },
    openJawFlightEur: {
      low: 600,
      mid: 780,
      high: 1050,
      sourceLabelIt: 'Wikivoyage Vietnam / Cambodia — Getting there',
      sourceUrl: `${WV}/Vietnam#Get_in`,
      retrievedOn: ON,
    },
  },
  {
    id: 'thailandia-malesia',
    slugs: ['thailandia', 'malesia'],
    titleIt: 'Thailandia + Malesia',
    blurbIt: 'Bangkok (e sud), poi Kuala Lumpur / Penang. Open-jaw BKK→KUL.',
    arrivalHubIata: 'BKK',
    departureHubIata: 'KUL',
    transfer: {
      fromSlug: 'thailandia',
      toSlug: 'malesia',
      mode: 'internal_flight',
      durationHours: 2,
      verified: true,
      costEurPerPerson: 80,
      notesIt: 'Volo Bangkok↔Kuala Lumpur (treno/bus via Hat Yai più lento).',
      sourceLabelIt: 'Wikivoyage Malaysia — Get in',
      sourceUrl: `${WV}/Malaysia#Get_in`,
      retrievedOn: ON,
    },
    openJawFlightEur: {
      low: 650,
      mid: 850,
      high: 1150,
      sourceLabelIt: 'Wikivoyage Thailand / Malaysia — Getting there',
      sourceUrl: `${WV}/Malaysia#Get_in`,
      retrievedOn: ON,
    },
  },
  {
    id: 'spagna-portogallo',
    slugs: ['spagna', 'portogallo'],
    titleIt: 'Spagna + Portogallo',
    blurbIt: 'Madrid o Andalusia, poi Lisbona/Porto. Open-jaw MAD→LIS.',
    arrivalHubIata: 'MAD',
    departureHubIata: 'LIS',
    transfer: {
      fromSlug: 'spagna',
      toSlug: 'portogallo',
      mode: 'train',
      durationHours: 10,
      verified: true,
      costEurPerPerson: 55,
      notesIt: 'Treno/bus Madrid–Lisbona (tempi lunghi; alternativa volo breve).',
      sourceLabelIt: 'Wikivoyage Lisbon — Get in',
      sourceUrl: `${WV}/Lisbon#Get_in`,
      retrievedOn: ON,
    },
    openJawFlightEur: {
      low: 90,
      mid: 160,
      high: 320,
      sourceLabelIt: 'Wikivoyage Spain / Portugal — Getting there',
      sourceUrl: `${WV}/Portugal#Get_in`,
      retrievedOn: ON,
    },
  },
  {
    id: 'tanzania-zanzibar',
    slugs: ['tanzania', 'zanzibar'],
    titleIt: 'Tanzania + Zanzibar',
    blurbIt: 'Safari nord (Arusha), poi spiaggia a Zanzibar. Open-jaw JRO→ZNZ.',
    arrivalHubIata: 'JRO',
    departureHubIata: 'ZNZ',
    transfer: {
      fromSlug: 'tanzania',
      toSlug: 'zanzibar',
      mode: 'internal_flight',
      durationHours: 1.5,
      verified: true,
      costEurPerPerson: 90,
      notesIt: 'Volo Arusha/Kilimanjaro o Dar ↔ Zanzibar (ferry da Dar più lungo).',
      sourceLabelIt: 'Wikivoyage Zanzibar — Get in',
      sourceUrl: `${WV}/Zanzibar#Get_in`,
      retrievedOn: ON,
    },
    openJawFlightEur: {
      low: 550,
      mid: 750,
      high: 1050,
      sourceLabelIt: 'Wikivoyage Tanzania / Zanzibar — Getting there',
      sourceUrl: `${WV}/Tanzania#Get_in`,
      retrievedOn: ON,
    },
  },
  {
    id: 'inghilterra-scozia',
    slugs: ['inghilterra', 'scozia'],
    titleIt: 'Inghilterra + Scozia',
    blurbIt: 'Londra e dintorni, poi Edimburgo / Highlands. Open-jaw LHR→EDI.',
    arrivalHubIata: 'LHR',
    departureHubIata: 'EDI',
    transfer: {
      fromSlug: 'inghilterra',
      toSlug: 'scozia',
      mode: 'train',
      durationHours: 4.5,
      verified: true,
      costEurPerPerson: 70,
      notesIt: 'Treno Londra–Edimburgo (LNER/Avanti — orari e prezzi variabili).',
      sourceLabelIt: 'Wikivoyage Edinburgh — Get in',
      sourceUrl: `${WV}/Edinburgh#Get_in`,
      retrievedOn: ON,
    },
    openJawFlightEur: {
      low: 80,
      mid: 140,
      high: 280,
      sourceLabelIt: 'Wikivoyage United Kingdom — Getting there',
      sourceUrl: `${WV}/United_Kingdom#Get_in`,
      retrievedOn: ON,
    },
  },
  {
    id: 'danimarca-faer-oer',
    slugs: ['danimarca', 'faer-oer'],
    titleIt: 'Danimarca + Fær Øer',
    blurbIt: 'Copenhagen, poi isole Fær Øer. Open-jaw CPH→FAE.',
    arrivalHubIata: 'CPH',
    departureHubIata: 'FAE',
    transfer: {
      fromSlug: 'danimarca',
      toSlug: 'faer-oer',
      mode: 'internal_flight',
      durationHours: 2.2,
      verified: true,
      costEurPerPerson: 180,
      notesIt: 'Volo Copenhagen↔Vágar (FAE). Traghetto più lungo, stagionale.',
      sourceLabelIt: 'Wikivoyage Faroe Islands — Get in',
      sourceUrl: `${WV}/Faroe_Islands#Get_in`,
      retrievedOn: ON,
    },
    openJawFlightEur: {
      low: 200,
      mid: 320,
      high: 520,
      sourceLabelIt: 'Wikivoyage Denmark / Faroe Islands — Getting there',
      sourceUrl: `${WV}/Faroe_Islands#Get_in`,
      retrievedOn: ON,
    },
  },
];

export function listCuratedMultiCountryPairs(): CuratedMultiCountryPair[] {
  return CURATED_MULTI_COUNTRY_PAIRS;
}

export function findCuratedPair(
  slugA: string,
  slugB: string
): CuratedMultiCountryPair | null {
  const a = slugA.trim().toLowerCase();
  const b = slugB.trim().toLowerCase();
  return (
    CURATED_MULTI_COUNTRY_PAIRS.find(
      (p) =>
        (p.slugs[0] === a && p.slugs[1] === b) ||
        (p.slugs[0] === b && p.slugs[1] === a)
    ) ?? null
  );
}

/** Partners offered when the user already picked one country. */
export function curatedPartnersFor(slug: string): CuratedMultiCountryPair[] {
  const key = slug.trim().toLowerCase();
  return CURATED_MULTI_COUNTRY_PAIRS.filter((p) => p.slugs.includes(key));
}

export function pairContainsSlugs(
  pair: CuratedMultiCountryPair,
  slugs: string[]
): boolean {
  const set = new Set(slugs.map((s) => s.toLowerCase()));
  return pair.slugs.every((s) => set.has(s)) && set.size === 2;
}
