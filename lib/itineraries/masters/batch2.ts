/**
 * Batch 2 — altre mete catalogo (non ancora «active» in seed, ma richieste dall’owner).
 * Stesso standard: master route + provenienza Wikivoyage/OSM/ufficiali, testi IT originali.
 */

import type { DestinationMaster, MasterProvenance } from '@/lib/itineraries/masters/types';

const ON = '2026-11-09';
const WV = 'https://en.wikivoyage.org/wiki';
const OSM = 'https://www.openstreetmap.org/copyright';

function p(
  id: string,
  claimIt: string,
  sourceUrl: string,
  attribution: string,
  license: MasterProvenance['license']
): MasterProvenance {
  return { id, claimIt, sourceUrl, attribution, license, retrievedOn: ON };
}

function master(partial: DestinationMaster): DestinationMaster {
  return partial;
}

export const BATCH2_MASTERS: DestinationMaster[] = [
  master({
    slug: 'giappone',
    nameIt: 'Giappone',
    summaryIt: 'Tokyo hub, Kyoto classica; Osaka/Hiroshima in estensione. No backtracking inutile.',
    idealTripDays: 14,
    styleDefault: 'divertimento',
    hubs: ['NRT', 'HND', 'KIX', 'ITM'],
    budgetOrientativeEur: { flights_hint: 900, hotel_hint: 800, activities_hint: 200, food_hint: 400, total_hint: 2300 },
    logisticsNotesIt: 'Shinkansen Tokyo–Kyoto ~2–2,5 h tipiche (JR — conferma). Hiroshima in giornata o overnight da Kyoto/Osaka.',
    provenance: [
      p('wv-jp', 'Japan (Wikivoyage).', `${WV}/Japan`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-tokyo', 'Tokyo (Wikivoyage).', `${WV}/Tokyo`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-kyoto', 'Kyoto (Wikivoyage).', `${WV}/Kyoto`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-jp', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'tokyo', nameIt: 'Tokyo', nightsMin: 3, nightsIdeal: 4, priority: 'core', lat: 35.6762, lng: 139.6503, airportHub: true, hubIata: 'HND', descriptionIt: 'Quartieri, templi urbani e base shinkansen.', sights: [{ nameIt: 'Asakusa / centro storico', priority: 'core', provenanceId: 'wv-tokyo' }, { nameIt: 'Shibuya / Shinjuku', priority: 'optional', provenanceId: 'wv-tokyo' }], transferToNext: { mode: 'train', durationHours: 2.5, verified: false, notesIt: 'Shinkansen Tokyo→Kyoto: conferma orario JR.' } },
      { id: 'kyoto', nameIt: 'Kyoto', nightsMin: 3, nightsIdeal: 4, priority: 'core', lat: 35.0116, lng: 135.7681, descriptionIt: 'Templi, santuari e quartieri tradizionali.', sights: [{ nameIt: 'Fushimi / templi est', priority: 'core', provenanceId: 'wv-kyoto' }, { nameIt: 'Arashiyama', priority: 'optional', provenanceId: 'wv-kyoto' }], transferToNext: { mode: 'train', durationHours: 1.5, verified: false, notesIt: 'Verso Hiroshima o Osaka — conferma.' } },
      { id: 'hiroshima', nameIt: 'Hiroshima', nightsMin: 1, nightsIdeal: 2, priority: 'extend', lat: 34.3853, lng: 132.4553, descriptionIt: 'Memoriale e Miyajima se i giorni bastano.', sights: [{ nameIt: 'Parco della Pace', priority: 'core', provenanceId: 'wv-jp' }, { nameIt: 'Miyajima', priority: 'optional', provenanceId: 'wv-jp' }] },
    ],
  }),
  master({
    slug: 'indonesia',
    nameIt: 'Indonesia',
    summaryIt: 'Bali come base classica; Ubud + costa sud. Altre isole solo con giorni lunghi.',
    idealTripDays: 14,
    styleDefault: 'relax',
    hubs: ['DPS'],
    budgetOrientativeEur: { flights_hint: 750, hotel_hint: 500, activities_hint: 150, food_hint: 200, total_hint: 1600 },
    logisticsNotesIt: 'Trasferimenti Bali in auto/driver: tempi traffico variabili. Lombok/Gili solo con buffer.',
    provenance: [
      p('wv-id', 'Indonesia (Wikivoyage).', `${WV}/Indonesia`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-bali', 'Bali (Wikivoyage).', `${WV}/Bali`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-id', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'south', nameIt: 'Costa sud Bali', nightsMin: 2, nightsIdeal: 3, priority: 'core', lat: -8.809, lng: 115.16, airportHub: true, hubIata: 'DPS', descriptionIt: 'Arrivo e spiagge/canggu-seminyak area.', sights: [{ nameIt: 'Spiaggia e zona sud', priority: 'core', provenanceId: 'wv-bali' }], transferToNext: { mode: 'bus', durationHours: 2, verified: false, notesIt: 'Verso Ubud: traffico tipico 1,5–2,5 h.' } },
      { id: 'ubud', nameIt: 'Ubud', nightsMin: 3, nightsIdeal: 4, priority: 'core', lat: -8.5069, lng: 115.2625, descriptionIt: 'Risaie, templi e ritmo interno.', sights: [{ nameIt: 'Risaie e templi', priority: 'core', provenanceId: 'wv-bali' }, { nameIt: 'Mercati / cooking', priority: 'optional', provenanceId: 'wv-bali' }], transferToNext: { mode: 'bus', durationHours: 3, verified: false, notesIt: 'Verso est/nord o rientro sud.' } },
      { id: 'east', nameIt: 'Est / Amed (opzionale)', nightsMin: 2, nightsIdeal: 3, priority: 'optional', lat: -8.333, lng: 115.65, descriptionIt: 'Costa est più tranquilla se i giorni bastano.', sights: [{ nameIt: 'Snorkel / villaggi', priority: 'core', provenanceId: 'wv-bali' }] },
    ],
  }),
  master({
    slug: 'egitto',
    nameIt: 'Egitto',
    summaryIt: 'Il Cairo hub; Luxor (o crociera Nilo) in estensione; Mar Rosso opzionale.',
    idealTripDays: 10,
    styleDefault: 'avventura',
    hubs: ['CAI', 'LXR', 'HRG'],
    budgetOrientativeEur: { flights_hint: 350, hotel_hint: 400, activities_hint: 150, food_hint: 180, total_hint: 1080 },
    logisticsNotesIt: 'Cairo–Luxor: volo interno o treno notturno. Verifica sicurezza e guide aggiornate.',
    provenance: [
      p('wv-eg', 'Egypt (Wikivoyage).', `${WV}/Egypt`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-cairo', 'Cairo (Wikivoyage).', `${WV}/Cairo`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-luxor', 'Luxor (Wikivoyage).', `${WV}/Luxor`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-eg', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'cairo', nameIt: 'Il Cairo', nightsMin: 2, nightsIdeal: 3, priority: 'core', lat: 30.0444, lng: 31.2357, airportHub: true, hubIata: 'CAI', descriptionIt: 'Museo/piramidi e città islamica — ritmo intenso.', sights: [{ nameIt: 'Giza / museo', priority: 'core', provenanceId: 'wv-cairo' }, { nameIt: 'Khan el-Khalili', priority: 'optional', provenanceId: 'wv-cairo' }], transferToNext: { mode: 'internal_flight', durationHours: 1.5, verified: false, notesIt: 'Volo o treno verso Luxor — conferma.' } },
      { id: 'luxor', nameIt: 'Luxor', nightsMin: 2, nightsIdeal: 3, priority: 'core', lat: 25.6872, lng: 32.6396, airportHub: true, hubIata: 'LXR', descriptionIt: 'Templi e Valle dei Re.', sights: [{ nameIt: 'Karnak e Luxor Temple', priority: 'core', provenanceId: 'wv-luxor' }, { nameIt: 'West Bank', priority: 'core', provenanceId: 'wv-luxor' }], transferToNext: { mode: 'internal_flight', durationHours: 1.5, verified: false, notesIt: 'Eventuale Mar Rosso.' } },
      { id: 'redsea', nameIt: 'Mar Rosso', nightsMin: 2, nightsIdeal: 3, priority: 'optional', lat: 27.2579, lng: 33.8116, airportHub: true, hubIata: 'HRG', descriptionIt: 'Mare e diving — solo con giorni extra.', sights: [{ nameIt: 'Spiaggia / reef', priority: 'core', provenanceId: 'wv-eg' }] },
    ],
  }),
  master({
    slug: 'emirati-arabi',
    nameIt: 'Emirati Arabi',
    summaryIt: 'Dubai hub; Abu Dhabi come day/overnight senza backtracking.',
    idealTripDays: 7,
    styleDefault: 'divertimento',
    hubs: ['DXB', 'AUH'],
    budgetOrientativeEur: { flights_hint: 450, hotel_hint: 600, activities_hint: 200, food_hint: 300, total_hint: 1550 },
    logisticsNotesIt: 'Dubai–Abu Dhabi ~1,5 h in strada tipiche (da confermare).',
    provenance: [
      p('wv-ae', 'United Arab Emirates (Wikivoyage).', `${WV}/United_Arab_Emirates`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-dubai', 'Dubai (Wikivoyage).', `${WV}/Dubai`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-ae', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'dubai', nameIt: 'Dubai', nightsMin: 3, nightsIdeal: 4, priority: 'core', lat: 25.2048, lng: 55.2708, airportHub: true, hubIata: 'DXB', descriptionIt: 'Skyline, souk e mare.', sights: [{ nameIt: 'Downtown / Burj area', priority: 'core', provenanceId: 'wv-dubai' }, { nameIt: 'Deira / souk', priority: 'optional', provenanceId: 'wv-dubai' }], transferToNext: { mode: 'bus', durationHours: 1.5, verified: false, notesIt: 'Transfer Dubai→Abu Dhabi.' } },
      { id: 'auh', nameIt: 'Abu Dhabi', nightsMin: 1, nightsIdeal: 2, priority: 'extend', lat: 24.4539, lng: 54.3773, airportHub: true, hubIata: 'AUH', descriptionIt: 'Grande moschea e lungomare.', sights: [{ nameIt: 'Sheikh Zayed Mosque', priority: 'core', provenanceId: 'wv-ae' }] },
    ],
  }),
  master({
    slug: 'inghilterra',
    nameIt: 'Inghilterra',
    summaryIt: 'Londra hub; Bath/Oxford o costa sud in estensione.',
    idealTripDays: 7,
    styleDefault: 'divertimento',
    hubs: ['LHR', 'LGW', 'STN'],
    budgetOrientativeEur: { flights_hint: 100, hotel_hint: 550, activities_hint: 120, food_hint: 280, total_hint: 1050 },
    logisticsNotesIt: 'Treni nazionali: tempi e scioperi da verificare (National Rail).',
    provenance: [
      p('wv-eng', 'England (Wikivoyage).', `${WV}/England`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-london', 'London (Wikivoyage).', `${WV}/London`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-eng', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'london', nameIt: 'Londra', nightsMin: 3, nightsIdeal: 4, priority: 'core', lat: 51.5074, lng: -0.1278, airportHub: true, hubIata: 'LHR', descriptionIt: 'Musei, quartieri e Tamigi.', sights: [{ nameIt: 'Centro e musei', priority: 'core', provenanceId: 'wv-london' }, { nameIt: 'East End / mercati', priority: 'optional', provenanceId: 'wv-london' }], transferToNext: { mode: 'train', durationHours: 1.5, verified: false, notesIt: 'Day trip o overnight verso Bath/Oxford.' } },
      { id: 'bath', nameIt: 'Bath / West', nightsMin: 1, nightsIdeal: 2, priority: 'extend', lat: 51.3811, lng: -2.359, descriptionIt: 'Terme romane e città georgiana.', sights: [{ nameIt: 'Roman Baths e centro', priority: 'core', provenanceId: 'wv-eng' }] },
    ],
  }),
  master({
    slug: 'scozia',
    nameIt: 'Scozia',
    summaryIt: 'Edimburgo hub; Highlands o Isola di Skye in estensione.',
    idealTripDays: 7,
    styleDefault: 'avventura',
    hubs: ['EDI', 'GLA'],
    budgetOrientativeEur: { flights_hint: 120, hotel_hint: 500, activities_hint: 100, food_hint: 250, total_hint: 970 },
    logisticsNotesIt: 'Edimburgo–Highlands: auto/tour. Skye richiede giorni dedicati.',
    provenance: [
      p('wv-sct', 'Scotland (Wikivoyage).', `${WV}/Scotland`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-edi', 'Edinburgh (Wikivoyage).', `${WV}/Edinburgh`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-sct', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'edi', nameIt: 'Edimburgo', nightsMin: 2, nightsIdeal: 3, priority: 'core', lat: 55.9533, lng: -3.1883, airportHub: true, hubIata: 'EDI', descriptionIt: 'Royal Mile, castello e Old Town.', sights: [{ nameIt: 'Castello e Royal Mile', priority: 'core', provenanceId: 'wv-edi' }], transferToNext: { mode: 'bus', durationHours: 4, verified: false, notesIt: 'Verso Highlands/Skye.' } },
      { id: 'highlands', nameIt: 'Highlands', nightsMin: 2, nightsIdeal: 3, priority: 'extend', lat: 57.4778, lng: -4.2247, descriptionIt: 'Laghi e paesaggi — meglio con auto.', sights: [{ nameIt: 'Loch e villaggi', priority: 'core', provenanceId: 'wv-sct' }] },
    ],
  }),
  master({
    slug: 'olanda',
    nameIt: 'Olanda',
    summaryIt: 'Amsterdam hub; Rotterdam/L’Aia o campagne in day trip.',
    idealTripDays: 5,
    styleDefault: 'divertimento',
    hubs: ['AMS'],
    budgetOrientativeEur: { flights_hint: 80, hotel_hint: 400, activities_hint: 80, food_hint: 200, total_hint: 760 },
    logisticsNotesIt: 'Treni NS capillari — conferma orari. Bicicletta in città.',
    provenance: [
      p('wv-nl', 'Netherlands (Wikivoyage).', `${WV}/Netherlands`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-ams', 'Amsterdam (Wikivoyage).', `${WV}/Amsterdam`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-nl', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'ams', nameIt: 'Amsterdam', nightsMin: 3, nightsIdeal: 4, priority: 'core', lat: 52.3676, lng: 4.9041, airportHub: true, hubIata: 'AMS', descriptionIt: 'Canali, musei e quartieri.', sights: [{ nameIt: 'Centro e musei', priority: 'core', provenanceId: 'wv-ams' }, { nameIt: 'Jordaan', priority: 'optional', provenanceId: 'wv-ams' }], transferToNext: { mode: 'train', durationHours: 1, verified: false, notesIt: 'Day trip Rotterdam/L’Aia.' } },
      { id: 'rotterdam', nameIt: 'Rotterdam / costa', nightsMin: 1, nightsIdeal: 1, priority: 'optional', lat: 51.9225, lng: 4.4792, descriptionIt: 'Architettura moderna o Scheveningen.', sights: [{ nameIt: 'Centro moderno / mare', priority: 'core', provenanceId: 'wv-nl' }] },
    ],
  }),
  master({
    slug: 'stati-uniti',
    nameIt: 'Stati Uniti',
    summaryIt: 'Una costa per viaggio: NYC classica, o Ovest (LA/SF) — non entrambe sotto i 14 giorni.',
    idealTripDays: 14,
    styleDefault: 'divertimento',
    hubs: ['JFK', 'EWR', 'LAX', 'SFO'],
    budgetOrientativeEur: { flights_hint: 700, hotel_hint: 1100, activities_hint: 300, food_hint: 500, total_hint: 2600 },
    logisticsNotesIt: 'Jet lag + distanze interne. Preferisci una regione.',
    provenance: [
      p('wv-us', 'United States (Wikivoyage).', `${WV}/United_States_of_America`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-nyc', 'New York City (Wikivoyage).', `${WV}/New_York_City`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-us', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'nyc', nameIt: 'New York', nightsMin: 4, nightsIdeal: 5, priority: 'core', lat: 40.7128, lng: -74.006, airportHub: true, hubIata: 'JFK', descriptionIt: 'Manhattan e borough — ritmo alto.', sights: [{ nameIt: 'Centro e musei', priority: 'core', provenanceId: 'wv-nyc' }, { nameIt: 'Brooklyn', priority: 'optional', provenanceId: 'wv-nyc' }], transferToNext: { mode: 'internal_flight', durationHours: 6, verified: false, notesIt: 'Eventuale Ovest solo con 14+ giorni.' } },
      { id: 'west', nameIt: 'Costa Ovest (opzionale)', nightsMin: 3, nightsIdeal: 5, priority: 'optional', lat: 34.0522, lng: -118.2437, airportHub: true, hubIata: 'LAX', descriptionIt: 'LA o SF — scegline una.', sights: [{ nameIt: 'Città e dintorni', priority: 'core', provenanceId: 'wv-us' }] },
    ],
  }),
  master({
    slug: 'australia',
    nameIt: 'Australia',
    summaryIt: 'Sydney o Melbourne come hub; non unire entrambe + Outback sotto i 14 giorni.',
    idealTripDays: 14,
    styleDefault: 'avventura',
    hubs: ['SYD', 'MEL'],
    budgetOrientativeEur: { flights_hint: 1100, hotel_hint: 900, activities_hint: 250, food_hint: 450, total_hint: 2700 },
    logisticsNotesIt: 'Distanze enormi: una città + dintorni. Voli interni costosi in tempo.',
    provenance: [
      p('wv-au', 'Australia (Wikivoyage).', `${WV}/Australia`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-syd', 'Sydney (Wikivoyage).', `${WV}/Sydney`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-au', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'sydney', nameIt: 'Sydney', nightsMin: 4, nightsIdeal: 5, priority: 'core', lat: -33.8688, lng: 151.2093, airportHub: true, hubIata: 'SYD', descriptionIt: 'Harbour, spiagge e quartieri.', sights: [{ nameIt: 'Opera House / Harbour', priority: 'core', provenanceId: 'wv-syd' }, { nameIt: 'Bondi / coste', priority: 'optional', provenanceId: 'wv-syd' }], transferToNext: { mode: 'internal_flight', durationHours: 1.5, verified: false, notesIt: 'Verso Melbourne o Cairns solo con giorni.' } },
      { id: 'melbourne', nameIt: 'Melbourne', nightsMin: 3, nightsIdeal: 4, priority: 'extend', lat: -37.8136, lng: 144.9631, airportHub: true, hubIata: 'MEL', descriptionIt: 'Caffè, lane e Great Ocean Road se i giorni bastano.', sights: [{ nameIt: 'Centro e lane', priority: 'core', provenanceId: 'wv-au' }] },
    ],
  }),
  master({
    slug: 'peru',
    nameIt: 'Perù',
    summaryIt: 'Lima hub; Cusco/Sacred Valley/Machu Picchu come cuore; Lago Titicaca opzionale.',
    idealTripDays: 14,
    styleDefault: 'avventura',
    hubs: ['LIM', 'CUZ'],
    budgetOrientativeEur: { flights_hint: 800, hotel_hint: 500, activities_hint: 250, food_hint: 220, total_hint: 1770 },
    logisticsNotesIt: 'Acclimatazione a Cusco. Treni/bus Machu Picchu: prenota e verifica orari.',
    provenance: [
      p('wv-pe', 'Peru (Wikivoyage).', `${WV}/Peru`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-cusco', 'Cusco (Wikivoyage).', `${WV}/Cusco`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-pe', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'lima', nameIt: 'Lima', nightsMin: 1, nightsIdeal: 2, priority: 'core', lat: -12.0464, lng: -77.0428, airportHub: true, hubIata: 'LIM', descriptionIt: 'Arrivo e cibo a Miraflores/Barranco.', sights: [{ nameIt: 'Miraflores / centro', priority: 'core', provenanceId: 'wv-pe' }], transferToNext: { mode: 'internal_flight', durationHours: 1.5, verified: false, notesIt: 'Volo Lima→Cusco.' } },
      { id: 'cusco', nameIt: 'Cusco e Valle Sacra', nightsMin: 4, nightsIdeal: 5, priority: 'core', lat: -13.5319, lng: -71.9675, airportHub: true, hubIata: 'CUZ', descriptionIt: 'Altitudine, rovine e base Machu Picchu.', sights: [{ nameIt: 'Cusco storico', priority: 'core', provenanceId: 'wv-cusco' }, { nameIt: 'Machu Picchu', priority: 'core', provenanceId: 'wv-cusco' }, { nameIt: 'Valle Sacra', priority: 'optional', provenanceId: 'wv-cusco' }] },
    ],
  }),
  master({
    slug: 'kenya',
    nameIt: 'Kenya',
    summaryIt: 'Nairobi hub; safari Masai Mara (o Amboseli) — non moltiplicare i parchi sotto i 10 giorni.',
    idealTripDays: 10,
    styleDefault: 'avventura',
    hubs: ['NBO'],
    budgetOrientativeEur: { flights_hint: 600, hotel_hint: 700, activities_hint: 400, food_hint: 200, total_hint: 1900 },
    logisticsNotesIt: 'Safari con operator/licenze. Tempi strada Nairobi–Mara variabili.',
    provenance: [
      p('wv-ke', 'Kenya (Wikivoyage).', `${WV}/Kenya`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-nairobi', 'Nairobi (Wikivoyage).', `${WV}/Nairobi`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-ke', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'nairobi', nameIt: 'Nairobi', nightsMin: 1, nightsIdeal: 2, priority: 'core', lat: -1.2921, lng: 36.8219, airportHub: true, hubIata: 'NBO', descriptionIt: 'Arrivo e brief safari.', sights: [{ nameIt: 'Città / museo', priority: 'optional', provenanceId: 'wv-nairobi' }], transferToNext: { mode: 'bus', durationHours: 5, verified: false, notesIt: 'Transfer verso Masai Mara — conferma.' } },
      { id: 'mara', nameIt: 'Masai Mara', nightsMin: 3, nightsIdeal: 4, priority: 'core', lat: -1.4061, lng: 35.0, descriptionIt: 'Game drive — cuore del viaggio.', sights: [{ nameIt: 'Safari in riserva', priority: 'core', provenanceId: 'wv-ke' }] },
    ],
  }),
  master({
    slug: 'maldive',
    nameIt: 'Maldive',
    summaryIt: 'Malé hub; una sola isola/resort o guesthouse atollo — zero hop multipli.',
    idealTripDays: 7,
    styleDefault: 'relax',
    hubs: ['MLE'],
    budgetOrientativeEur: { flights_hint: 800, hotel_hint: 1200, activities_hint: 200, food_hint: 300, total_hint: 2500 },
    logisticsNotesIt: 'Transfer idrovolante/speedboat dal MLE: orari luce del giorno tipici — verifica.',
    provenance: [
      p('wv-mv', 'Maldives (Wikivoyage).', `${WV}/Maldives`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-mv', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'male', nameIt: 'Malé / transfer', nightsMin: 1, nightsIdeal: 1, priority: 'core', lat: 4.1755, lng: 73.5093, airportHub: true, hubIata: 'MLE', descriptionIt: 'Arrivo e trasferimento all’atollo.', sights: [{ nameIt: 'Transfer atollo', priority: 'core', provenanceId: 'wv-mv' }], transferToNext: { mode: 'ferry', durationHours: 2, verified: false, notesIt: 'Speedboat/idrovolante — conferma orario.' } },
      { id: 'island', nameIt: 'Isola / atollo', nightsMin: 5, nightsIdeal: 6, priority: 'core', lat: 3.2, lng: 73.0, descriptionIt: 'Mare e snorkel: resta su una base.', sights: [{ nameIt: 'Spiaggia e reef', priority: 'core', provenanceId: 'wv-mv' }] },
    ],
  }),
  master({
    slug: 'cambogia',
    nameIt: 'Cambogia',
    summaryIt: 'Siem Reap (Angkor) cuore; Phnom Penh in estensione.',
    idealTripDays: 7,
    styleDefault: 'avventura',
    hubs: ['REP', 'PNH'],
    budgetOrientativeEur: { flights_hint: 650, hotel_hint: 280, activities_hint: 120, food_hint: 150, total_hint: 1200 },
    logisticsNotesIt: 'Siem Reap–Phnom Penh: strada/bus ~6 h tipiche (da confermare).',
    provenance: [
      p('wv-kh', 'Cambodia (Wikivoyage).', `${WV}/Cambodia`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-siem', 'Siem Reap (Wikivoyage).', `${WV}/Siem_Reap`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-kh', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'siem', nameIt: 'Siem Reap', nightsMin: 3, nightsIdeal: 4, priority: 'core', lat: 13.3633, lng: 103.8564, airportHub: true, hubIata: 'REP', descriptionIt: 'Angkor all’alba e templi.', sights: [{ nameIt: 'Angkor Wat / circuito', priority: 'core', provenanceId: 'wv-siem' }], transferToNext: { mode: 'bus', durationHours: 6, verified: false, notesIt: 'Verso Phnom Penh.' } },
      { id: 'pnh', nameIt: 'Phnom Penh', nightsMin: 2, nightsIdeal: 2, priority: 'extend', lat: 11.5564, lng: 104.9282, airportHub: true, hubIata: 'PNH', descriptionIt: 'Capitale sul Mekong.', sights: [{ nameIt: 'Palazzo reale / lungofiume', priority: 'core', provenanceId: 'wv-kh' }] },
    ],
  }),
  master({
    slug: 'nepal',
    nameIt: 'Nepal',
    summaryIt: 'Kathmandu hub; Pokhara e/o trekking soft — acclimatazione obbligatoria.',
    idealTripDays: 10,
    styleDefault: 'avventura',
    hubs: ['KTM'],
    budgetOrientativeEur: { flights_hint: 700, hotel_hint: 300, activities_hint: 200, food_hint: 150, total_hint: 1350 },
    logisticsNotesIt: 'Kathmandu–Pokhara: volo interno o strada lunga. Permessi trekking da verificare.',
    provenance: [
      p('wv-np', 'Nepal (Wikivoyage).', `${WV}/Nepal`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-ktm', 'Kathmandu (Wikivoyage).', `${WV}/Kathmandu`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-np', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'ktm', nameIt: 'Kathmandu', nightsMin: 2, nightsIdeal: 3, priority: 'core', lat: 27.7172, lng: 85.324, airportHub: true, hubIata: 'KTM', descriptionIt: 'Durbar square e valle.', sights: [{ nameIt: 'Durbar / stupa', priority: 'core', provenanceId: 'wv-ktm' }], transferToNext: { mode: 'bus', durationHours: 7, verified: false, notesIt: 'Verso Pokhara — strada o volo.' } },
      { id: 'pokhara', nameIt: 'Pokhara', nightsMin: 3, nightsIdeal: 4, priority: 'core', lat: 28.2096, lng: 83.9856, descriptionIt: 'Lago e base trekking soft.', sights: [{ nameIt: 'Lago Phewa', priority: 'core', provenanceId: 'wv-np' }, { nameIt: 'Viewpoint / short trek', priority: 'optional', provenanceId: 'wv-np' }] },
    ],
  }),
  master({
    slug: 'canarie',
    nameIt: 'Canarie',
    summaryIt: 'Una isola (Tenerife o Gran Canaria): evita hop multipli sotto i 10 giorni.',
    idealTripDays: 7,
    styleDefault: 'relax',
    hubs: ['TFS', 'TFN', 'LPA'],
    budgetOrientativeEur: { flights_hint: 150, hotel_hint: 400, activities_hint: 80, food_hint: 200, total_hint: 830 },
    logisticsNotesIt: 'Voli inter-isola facili ma mangiano mezza giornata.',
    provenance: [
      p('wv-canary', 'Canary Islands (Wikivoyage).', `${WV}/Canary_Islands`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-canary', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'tenerife', nameIt: 'Tenerife', nightsMin: 5, nightsIdeal: 6, priority: 'core', lat: 28.2916, lng: -16.6291, airportHub: true, hubIata: 'TFS', descriptionIt: 'Nord verde e sud spiaggia; Teide.', sights: [{ nameIt: 'Teide / paesaggi', priority: 'core', provenanceId: 'wv-canary' }, { nameIt: 'Costa sud', priority: 'optional', provenanceId: 'wv-canary' }] },
    ],
  }),
  master({
    slug: 'baleari',
    nameIt: 'Baleari',
    summaryIt: 'Maiorca o Ibiza: una isola, due basi al massimo.',
    idealTripDays: 7,
    styleDefault: 'relax',
    hubs: ['PMI', 'IBZ'],
    budgetOrientativeEur: { flights_hint: 120, hotel_hint: 450, activities_hint: 80, food_hint: 220, total_hint: 870 },
    logisticsNotesIt: 'Niente tre isole in una settimana.',
    provenance: [
      p('wv-bal', 'Balearic Islands (Wikivoyage).', `${WV}/Balearic_Islands`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-bal', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'palma', nameIt: 'Palma / Maiorca', nightsMin: 2, nightsIdeal: 3, priority: 'core', lat: 39.5696, lng: 2.6502, airportHub: true, hubIata: 'PMI', descriptionIt: 'Città e base per costa.', sights: [{ nameIt: 'Centro Palma', priority: 'core', provenanceId: 'wv-bal' }], transferToNext: { mode: 'bus', durationHours: 1.5, verified: false, notesIt: 'Verso costa nord/est.' } },
      { id: 'coast', nameIt: 'Costa Maiorca', nightsMin: 3, nightsIdeal: 4, priority: 'core', lat: 39.75, lng: 3.0, descriptionIt: 'Cala e villaggi.', sights: [{ nameIt: 'Spiagge / calette', priority: 'core', provenanceId: 'wv-bal' }] },
    ],
  }),
  master({
    slug: 'georgia',
    nameIt: 'Georgia',
    summaryIt: 'Tbilisi hub; Kazbegi o Kakheti in estensione.',
    idealTripDays: 7,
    styleDefault: 'avventura',
    hubs: ['TBS'],
    budgetOrientativeEur: { flights_hint: 250, hotel_hint: 280, activities_hint: 80, food_hint: 150, total_hint: 760 },
    logisticsNotesIt: 'Tbilisi–Kazbegi in strada ~3–4 h tipiche (da confermare).',
    provenance: [
      p('wv-ge', 'Georgia (country) (Wikivoyage).', `${WV}/Georgia_(country)`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('wv-tbs', 'Tbilisi (Wikivoyage).', `${WV}/Tbilisi`, 'Wikivoyage (CC BY-SA)', 'cc-by-sa'),
      p('osm-ge', 'Coordinate OSM.', OSM, '© OpenStreetMap contributors (ODbL)', 'odbl-osm'),
    ],
    stops: [
      { id: 'tbilisi', nameIt: 'Tbilisi', nightsMin: 3, nightsIdeal: 3, priority: 'core', lat: 41.7151, lng: 44.8271, airportHub: true, hubIata: 'TBS', descriptionIt: 'Città vecchia, terme e cibo.', sights: [{ nameIt: 'Città vecchia', priority: 'core', provenanceId: 'wv-tbs' }], transferToNext: { mode: 'bus', durationHours: 3.5, verified: false, notesIt: 'Verso Kazbegi/Kakheti.' } },
      { id: 'kazbegi', nameIt: 'Kazbegi / montagne', nightsMin: 2, nightsIdeal: 2, priority: 'extend', lat: 42.6575, lng: 44.6414, descriptionIt: 'Montagne e Gergeti.', sights: [{ nameIt: 'Gergeti / panorama', priority: 'core', provenanceId: 'wv-ge' }] },
    ],
  }),
];

export function getBatch2Master(slug: string): DestinationMaster | undefined {
  return BATCH2_MASTERS.find((m) => m.slug === slug);
}
