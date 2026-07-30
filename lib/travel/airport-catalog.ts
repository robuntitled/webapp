/**
 * Catalogo client-side città / aeroporti / paesi per autocomplete voli.
 * La ricerca usa sempre il label o IATA selezionato, mai il testo parziale digitato.
 */

export type PlaceKind = 'city' | 'airport' | 'country';

export type PlaceSuggestion = {
  id: string;
  kind: PlaceKind;
  /** Testo mostrato nel campo dopo selezione (es. "Tokyo") */
  label: string;
  /** Riga secondaria (es. "Haneda · Giappone") */
  sublabel: string;
  /** Codice IATA città/aeroporto; per country è il paese ISO2 */
  code: string;
  countryCode: string;
  countryLabel: string;
  /** true → ricerca multi-aeroporto (originCountry / destination country hub) */
  multiAirport?: boolean;
};

type AirportDef = {
  iata: string;
  name: string;
  city: string;
  cityIata?: string;
  countryCode: string;
  countryLabel: string;
  aliases?: string[];
};

type CountryDef = {
  code: string;
  label: string;
  aliases: string[];
  airports: string[];
};

const COUNTRIES: CountryDef[] = [
  {
    code: 'IT',
    label: 'Italia',
    aliases: ['italia', 'italy', 'it'],
    airports: [
      'FCO',
      'CIA',
      'MXP',
      'LIN',
      'BGY',
      'VCE',
      'NAP',
      'BLQ',
      'PSA',
      'CTA',
      'PMO',
      'BRI',
      'TRN',
      'GOA',
      'FLR',
      'AOI',
      'VRN',
      'TRS',
      'CAG',
      'OLB',
      'RMI',
      'BDS',
      'TSF',
    ],
  },
  {
    code: 'JP',
    label: 'Giappone',
    aliases: ['giappone', 'japan', 'jp'],
    airports: ['HND', 'NRT', 'KIX', 'ITM', 'NGO', 'FUK', 'CTS', 'OKA'],
  },
  {
    code: 'FR',
    label: 'Francia',
    aliases: ['francia', 'france', 'fr'],
    airports: ['CDG', 'ORY', 'NCE', 'LYS', 'MRS', 'TLS'],
  },
  {
    code: 'ES',
    label: 'Spagna',
    aliases: ['spagna', 'spain', 'es'],
    airports: ['MAD', 'BCN', 'AGP', 'PMI', 'ALC', 'VLC', 'IBZ'],
  },
  {
    code: 'GB',
    label: 'Regno Unito',
    aliases: ['regno unito', 'uk', 'england', 'gran bretagna', 'gb'],
    airports: ['LHR', 'LGW', 'STN', 'LTN', 'MAN', 'EDI', 'BHX'],
  },
  {
    code: 'DE',
    label: 'Germania',
    aliases: ['germania', 'germany', 'de'],
    airports: ['FRA', 'MUC', 'BER', 'DUS', 'HAM', 'CGN'],
  },
  {
    code: 'US',
    label: 'Stati Uniti',
    aliases: ['stati uniti', 'usa', 'america', 'us'],
    airports: ['JFK', 'EWR', 'LGA', 'LAX', 'ORD', 'MIA', 'SFO', 'BOS'],
  },
  {
    code: 'PT',
    label: 'Portogallo',
    aliases: ['portogallo', 'portugal', 'pt'],
    airports: ['LIS', 'OPO', 'FAO'],
  },
  {
    code: 'NL',
    label: 'Paesi Bassi',
    aliases: ['paesi bassi', 'olanda', 'netherlands', 'nl'],
    airports: ['AMS', 'EIN', 'RTM'],
  },
  {
    code: 'GR',
    label: 'Grecia',
    aliases: ['grecia', 'greece', 'gr'],
    airports: ['ATH', 'SKG', 'HER', 'JTR', 'JMK'],
  },
  {
    code: 'TH',
    label: 'Thailandia',
    aliases: ['thailandia', 'thailand', 'th'],
    airports: ['BKK', 'DMK', 'HKT', 'CNX'],
  },
  {
    code: 'AE',
    label: 'Emirati Arabi',
    aliases: ['emirati', 'emirati arabi', 'uae', 'dubai', 'ae'],
    airports: ['DXB', 'AUH', 'SHJ'],
  },
  {
    code: 'TR',
    label: 'Turchia',
    aliases: ['turchia', 'turkey', 'tr'],
    airports: ['IST', 'SAW', 'AYT', 'ADB'],
  },
  {
    code: 'CH',
    label: 'Svizzera',
    aliases: ['svizzera', 'switzerland', 'ch'],
    airports: ['ZRH', 'GVA', 'BSL'],
  },
  {
    code: 'AT',
    label: 'Austria',
    aliases: ['austria', 'at'],
    airports: ['VIE', 'SZG', 'INN'],
  },
  {
    code: 'EG',
    label: 'Egitto',
    aliases: ['egitto', 'egypt', 'eg', 'cairo'],
    airports: ['CAI', 'SSH', 'HRG', 'HBE', 'LXR'],
  },
  {
    code: 'GE',
    label: 'Georgia',
    aliases: ['georgia', 'ge', 'tbilisi', 'tbilissi'],
    airports: ['TBS', 'BUS', 'KUT'],
  },
  {
    code: 'MA',
    label: 'Marocco',
    aliases: ['marocco', 'morocco', 'ma', 'marrakech'],
    airports: ['RAK', 'CMN', 'AGA', 'TNG'],
  },
  {
    code: 'HR',
    label: 'Croazia',
    aliases: ['croazia', 'croatia', 'hr'],
    airports: ['ZAG', 'SPU', 'DBV'],
  },
  {
    code: 'CZ',
    label: 'Repubblica Ceca',
    aliases: ['repubblica ceca', 'cechia', 'czech', 'czechia', 'praga', 'prague', 'cz'],
    airports: ['PRG'],
  },
  {
    code: 'ID',
    label: 'Indonesia',
    aliases: ['indonesia', 'id', 'bali'],
    airports: ['DPS'],
  },
  {
    code: 'AU',
    label: 'Australia',
    aliases: ['australia', 'au'],
    airports: ['SYD', 'MEL'],
  },
  {
    code: 'KR',
    label: 'Corea del Sud',
    aliases: ['corea', 'corea del sud', 'south korea', 'korea', 'kr', 'seoul'],
    airports: ['ICN', 'GMP'],
  },
  {
    code: 'SG',
    label: 'Singapore',
    aliases: ['singapore', 'sg'],
    airports: ['SIN'],
  },
  {
    code: 'MT',
    label: 'Malta',
    aliases: ['malta', 'mt'],
    airports: ['MLA'],
  },
];

const AIRPORTS: AirportDef[] = [
  // Italia
  { iata: 'FCO', name: 'Leonardo da Vinci', city: 'Roma', cityIata: 'ROM', countryCode: 'IT', countryLabel: 'Italia', aliases: ['fiumicino'] },
  { iata: 'CIA', name: 'Ciampino', city: 'Roma', cityIata: 'ROM', countryCode: 'IT', countryLabel: 'Italia' },
  { iata: 'MXP', name: 'Malpensa', city: 'Milano', cityIata: 'MIL', countryCode: 'IT', countryLabel: 'Italia' },
  { iata: 'LIN', name: 'Linate', city: 'Milano', cityIata: 'MIL', countryCode: 'IT', countryLabel: 'Italia' },
  { iata: 'BGY', name: 'Orio al Serio', city: 'Bergamo', cityIata: 'MIL', countryCode: 'IT', countryLabel: 'Italia', aliases: ['bergamo'] },
  { iata: 'VCE', name: 'Marco Polo', city: 'Venezia', countryCode: 'IT', countryLabel: 'Italia', aliases: ['venice'] },
  { iata: 'NAP', name: 'Capodichino', city: 'Napoli', countryCode: 'IT', countryLabel: 'Italia', aliases: ['naples'] },
  { iata: 'BLQ', name: 'Guglielmo Marconi', city: 'Bologna', countryCode: 'IT', countryLabel: 'Italia' },
  { iata: 'PSA', name: 'Galileo Galilei', city: 'Pisa', countryCode: 'IT', countryLabel: 'Italia', aliases: ['toscana'] },
  { iata: 'CTA', name: 'Fontanarossa', city: 'Catania', countryCode: 'IT', countryLabel: 'Italia', aliases: ['sicilia'] },
  { iata: 'PMO', name: 'Falcone Borsellino', city: 'Palermo', countryCode: 'IT', countryLabel: 'Italia' },
  { iata: 'BRI', name: 'Karol Wojtyła', city: 'Bari', countryCode: 'IT', countryLabel: 'Italia', aliases: ['puglia'] },
  { iata: 'TRN', name: 'Caselle', city: 'Torino', countryCode: 'IT', countryLabel: 'Italia', aliases: ['turin'] },
  { iata: 'GOA', name: 'Cristoforo Colombo', city: 'Genova', countryCode: 'IT', countryLabel: 'Italia', aliases: ['genoa'] },
  { iata: 'FLR', name: 'Amerigo Vespucci', city: 'Firenze', countryCode: 'IT', countryLabel: 'Italia', aliases: ['florence'] },
  { iata: 'AOI', name: 'Raffaello Sanzio', city: 'Ancona', countryCode: 'IT', countryLabel: 'Italia', aliases: ['falconara', 'marche'] },
  { iata: 'VRN', name: 'Valerio Catullo', city: 'Verona', countryCode: 'IT', countryLabel: 'Italia' },
  { iata: 'TRS', name: 'Ronchi dei Legionari', city: 'Trieste', countryCode: 'IT', countryLabel: 'Italia', aliases: ['friuli'] },
  { iata: 'CAG', name: 'Elmas', city: 'Cagliari', countryCode: 'IT', countryLabel: 'Italia', aliases: ['sardegna'] },
  { iata: 'OLB', name: 'Costa Smeralda', city: 'Olbia', countryCode: 'IT', countryLabel: 'Italia' },
  { iata: 'RMI', name: 'Federico Fellini', city: 'Rimini', countryCode: 'IT', countryLabel: 'Italia' },
  { iata: 'BDS', name: 'Papola Casale', city: 'Brindisi', countryCode: 'IT', countryLabel: 'Italia' },
  { iata: 'TSF', name: 'Canova', city: 'Treviso', countryCode: 'IT', countryLabel: 'Italia', aliases: ['venezia treviso'] },
  // Giappone
  { iata: 'HND', name: 'Haneda', city: 'Tokyo', cityIata: 'TYO', countryCode: 'JP', countryLabel: 'Giappone', aliases: ['tokio'] },
  { iata: 'NRT', name: 'Narita', city: 'Tokyo', cityIata: 'TYO', countryCode: 'JP', countryLabel: 'Giappone', aliases: ['tokio'] },
  { iata: 'KIX', name: 'Kansai', city: 'Osaka', cityIata: 'OSA', countryCode: 'JP', countryLabel: 'Giappone' },
  { iata: 'ITM', name: 'Itami', city: 'Osaka', cityIata: 'OSA', countryCode: 'JP', countryLabel: 'Giappone' },
  { iata: 'NGO', name: 'Chubu Centrair', city: 'Nagoya', countryCode: 'JP', countryLabel: 'Giappone' },
  { iata: 'FUK', name: 'Fukuoka', city: 'Fukuoka', countryCode: 'JP', countryLabel: 'Giappone' },
  { iata: 'CTS', name: 'New Chitose', city: 'Sapporo', countryCode: 'JP', countryLabel: 'Giappone' },
  { iata: 'OKA', name: 'Naha', city: 'Okinawa', countryCode: 'JP', countryLabel: 'Giappone' },
  // UK / Francia / Spagna / …
  { iata: 'LHR', name: 'Heathrow', city: 'Londra', cityIata: 'LON', countryCode: 'GB', countryLabel: 'Regno Unito', aliases: ['london'] },
  { iata: 'LGW', name: 'Gatwick', city: 'Londra', cityIata: 'LON', countryCode: 'GB', countryLabel: 'Regno Unito', aliases: ['london'] },
  { iata: 'STN', name: 'Stansted', city: 'Londra', cityIata: 'LON', countryCode: 'GB', countryLabel: 'Regno Unito', aliases: ['london'] },
  { iata: 'LTN', name: 'Luton', city: 'Londra', cityIata: 'LON', countryCode: 'GB', countryLabel: 'Regno Unito', aliases: ['london'] },
  { iata: 'MAN', name: 'Manchester', city: 'Manchester', countryCode: 'GB', countryLabel: 'Regno Unito' },
  { iata: 'EDI', name: 'Edinburgh', city: 'Edimburgo', countryCode: 'GB', countryLabel: 'Regno Unito', aliases: ['edinburgh'] },
  { iata: 'BHX', name: 'Birmingham', city: 'Birmingham', countryCode: 'GB', countryLabel: 'Regno Unito' },
  { iata: 'CDG', name: 'Charles de Gaulle', city: 'Parigi', cityIata: 'PAR', countryCode: 'FR', countryLabel: 'Francia', aliases: ['paris'] },
  { iata: 'ORY', name: 'Orly', city: 'Parigi', cityIata: 'PAR', countryCode: 'FR', countryLabel: 'Francia', aliases: ['paris'] },
  { iata: 'NCE', name: "Côte d'Azur", city: 'Nizza', countryCode: 'FR', countryLabel: 'Francia', aliases: ['nice'] },
  { iata: 'LYS', name: 'Saint-Exupéry', city: 'Lione', countryCode: 'FR', countryLabel: 'Francia', aliases: ['lyon'] },
  { iata: 'MRS', name: 'Provence', city: 'Marsiglia', countryCode: 'FR', countryLabel: 'Francia', aliases: ['marseille'] },
  { iata: 'TLS', name: 'Blagnac', city: 'Tolosa', countryCode: 'FR', countryLabel: 'Francia', aliases: ['toulouse'] },
  { iata: 'MAD', name: 'Barajas', city: 'Madrid', countryCode: 'ES', countryLabel: 'Spagna' },
  { iata: 'BCN', name: 'El Prat', city: 'Barcellona', countryCode: 'ES', countryLabel: 'Spagna', aliases: ['barcelona'] },
  { iata: 'AGP', name: 'Costa del Sol', city: 'Malaga', countryCode: 'ES', countryLabel: 'Spagna', aliases: ['málaga'] },
  { iata: 'PMI', name: 'Son Sant Joan', city: 'Palma', countryCode: 'ES', countryLabel: 'Spagna', aliases: ['maiorca', 'mallorca'] },
  { iata: 'ALC', name: 'Elche', city: 'Alicante', countryCode: 'ES', countryLabel: 'Spagna' },
  { iata: 'VLC', name: 'Manises', city: 'Valencia', countryCode: 'ES', countryLabel: 'Spagna' },
  { iata: 'IBZ', name: 'Ibiza', city: 'Ibiza', countryCode: 'ES', countryLabel: 'Spagna' },
  { iata: 'FRA', name: 'Frankfurt', city: 'Francoforte', countryCode: 'DE', countryLabel: 'Germania', aliases: ['frankfurt'] },
  { iata: 'MUC', name: 'Franz Josef Strauss', city: 'Monaco', countryCode: 'DE', countryLabel: 'Germania', aliases: ['munich', 'monaco di baviera'] },
  { iata: 'BER', name: 'Brandenburg', city: 'Berlino', countryCode: 'DE', countryLabel: 'Germania', aliases: ['berlin'] },
  { iata: 'DUS', name: 'Düsseldorf', city: 'Dusseldorf', countryCode: 'DE', countryLabel: 'Germania' },
  { iata: 'HAM', name: 'Hamburg', city: 'Amburgo', countryCode: 'DE', countryLabel: 'Germania', aliases: ['hamburg'] },
  { iata: 'CGN', name: 'Cologne/Bonn', city: 'Colonia', countryCode: 'DE', countryLabel: 'Germania', aliases: ['cologne'] },
  { iata: 'AMS', name: 'Schiphol', city: 'Amsterdam', countryCode: 'NL', countryLabel: 'Paesi Bassi', aliases: ['olanda'] },
  { iata: 'EIN', name: 'Eindhoven', city: 'Eindhoven', countryCode: 'NL', countryLabel: 'Paesi Bassi' },
  { iata: 'RTM', name: 'Rotterdam', city: 'Rotterdam', countryCode: 'NL', countryLabel: 'Paesi Bassi' },
  { iata: 'LIS', name: 'Humberto Delgado', city: 'Lisbona', countryCode: 'PT', countryLabel: 'Portogallo', aliases: ['lisbon'] },
  { iata: 'OPO', name: 'Francisco Sá Carneiro', city: 'Porto', countryCode: 'PT', countryLabel: 'Portogallo' },
  { iata: 'FAO', name: 'Faro', city: 'Faro', countryCode: 'PT', countryLabel: 'Portogallo', aliases: ['algarve'] },
  { iata: 'ATH', name: 'Eleftherios Venizelos', city: 'Atene', countryCode: 'GR', countryLabel: 'Grecia', aliases: ['athens'] },
  { iata: 'SKG', name: 'Makedonia', city: 'Salonicco', countryCode: 'GR', countryLabel: 'Grecia', aliases: ['thessaloniki'] },
  { iata: 'HER', name: 'Nikos Kazantzakis', city: 'Heraklion', countryCode: 'GR', countryLabel: 'Grecia', aliases: ['creta'] },
  { iata: 'JTR', name: 'Santorini', city: 'Santorini', countryCode: 'GR', countryLabel: 'Grecia' },
  { iata: 'JMK', name: 'Mykonos', city: 'Mykonos', countryCode: 'GR', countryLabel: 'Grecia' },
  { iata: 'JFK', name: 'John F. Kennedy', city: 'New York', cityIata: 'NYC', countryCode: 'US', countryLabel: 'Stati Uniti' },
  { iata: 'EWR', name: 'Newark', city: 'New York', cityIata: 'NYC', countryCode: 'US', countryLabel: 'Stati Uniti' },
  { iata: 'LGA', name: 'LaGuardia', city: 'New York', cityIata: 'NYC', countryCode: 'US', countryLabel: 'Stati Uniti' },
  { iata: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', countryCode: 'US', countryLabel: 'Stati Uniti', aliases: ['la'] },
  { iata: 'ORD', name: "O'Hare", city: 'Chicago', countryCode: 'US', countryLabel: 'Stati Uniti' },
  { iata: 'MIA', name: 'Miami Intl', city: 'Miami', countryCode: 'US', countryLabel: 'Stati Uniti' },
  { iata: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', countryCode: 'US', countryLabel: 'Stati Uniti' },
  { iata: 'BOS', name: 'Logan', city: 'Boston', countryCode: 'US', countryLabel: 'Stati Uniti' },
  { iata: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', countryCode: 'TH', countryLabel: 'Thailandia' },
  { iata: 'DMK', name: 'Don Mueang', city: 'Bangkok', countryCode: 'TH', countryLabel: 'Thailandia' },
  { iata: 'HKT', name: 'Phuket Intl', city: 'Phuket', countryCode: 'TH', countryLabel: 'Thailandia' },
  { iata: 'CNX', name: 'Chiang Mai', city: 'Chiang Mai', countryCode: 'TH', countryLabel: 'Thailandia' },
  { iata: 'DXB', name: 'Dubai Intl', city: 'Dubai', countryCode: 'AE', countryLabel: 'Emirati Arabi' },
  { iata: 'AUH', name: 'Abu Dhabi Intl', city: 'Abu Dhabi', countryCode: 'AE', countryLabel: 'Emirati Arabi' },
  { iata: 'SHJ', name: 'Sharjah', city: 'Sharjah', countryCode: 'AE', countryLabel: 'Emirati Arabi' },
  { iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', countryCode: 'TR', countryLabel: 'Turchia', aliases: ['istanbul'] },
  { iata: 'SAW', name: 'Sabiha Gökçen', city: 'Istanbul', countryCode: 'TR', countryLabel: 'Turchia' },
  { iata: 'AYT', name: 'Antalya', city: 'Antalya', countryCode: 'TR', countryLabel: 'Turchia' },
  { iata: 'ADB', name: 'Adnan Menderes', city: 'Izmir', countryCode: 'TR', countryLabel: 'Turchia' },
  { iata: 'ZRH', name: 'Zürich', city: 'Zurigo', countryCode: 'CH', countryLabel: 'Svizzera', aliases: ['zurich'] },
  { iata: 'GVA', name: 'Geneva', city: 'Ginevra', countryCode: 'CH', countryLabel: 'Svizzera', aliases: ['geneva'] },
  { iata: 'BSL', name: 'EuroAirport', city: 'Basilea', countryCode: 'CH', countryLabel: 'Svizzera', aliases: ['basel'] },
  { iata: 'VIE', name: 'Schwechat', city: 'Vienna', countryCode: 'AT', countryLabel: 'Austria' },
  { iata: 'SZG', name: 'Salzburg', city: 'Salisburgo', countryCode: 'AT', countryLabel: 'Austria' },
  { iata: 'INN', name: 'Innsbruck', city: 'Innsbruck', countryCode: 'AT', countryLabel: 'Austria' },
  { iata: 'DPS', name: 'Ngurah Rai', city: 'Bali', countryCode: 'ID', countryLabel: 'Indonesia', aliases: ['denpasar'] },
  { iata: 'SIN', name: 'Changi', city: 'Singapore', countryCode: 'SG', countryLabel: 'Singapore' },
  { iata: 'HKG', name: 'Hong Kong Intl', city: 'Hong Kong', countryCode: 'HK', countryLabel: 'Hong Kong' },
  { iata: 'ICN', name: 'Incheon', city: 'Seoul', cityIata: 'SEL', countryCode: 'KR', countryLabel: 'Corea del Sud' },
  { iata: 'GMP', name: 'Gimpo', city: 'Seoul', cityIata: 'SEL', countryCode: 'KR', countryLabel: 'Corea del Sud' },
  { iata: 'SYD', name: 'Kingsford Smith', city: 'Sydney', countryCode: 'AU', countryLabel: 'Australia' },
  { iata: 'MEL', name: 'Tullamarine', city: 'Melbourne', countryCode: 'AU', countryLabel: 'Australia' },
  // Egitto
  { iata: 'CAI', name: 'Cairo Intl', city: 'Il Cairo', countryCode: 'EG', countryLabel: 'Egitto', aliases: ['cairo', 'egitto'] },
  { iata: 'SSH', name: 'Sharm El Sheikh', city: 'Sharm el-Sheikh', countryCode: 'EG', countryLabel: 'Egitto', aliases: ['sharm'] },
  { iata: 'HRG', name: 'Hurghada', city: 'Hurghada', countryCode: 'EG', countryLabel: 'Egitto' },
  { iata: 'HBE', name: 'Borg El Arab', city: 'Alessandria', countryCode: 'EG', countryLabel: 'Egitto', aliases: ['alexandria'] },
  { iata: 'LXR', name: 'Luxor', city: 'Luxor', countryCode: 'EG', countryLabel: 'Egitto' },
  // Georgia
  { iata: 'TBS', name: 'Tbilisi Intl', city: 'Tbilisi', countryCode: 'GE', countryLabel: 'Georgia', aliases: ['tbilissi', 'georgia'] },
  { iata: 'BUS', name: 'Batumi', city: 'Batumi', countryCode: 'GE', countryLabel: 'Georgia' },
  { iata: 'KUT', name: 'Kopitnari', city: 'Kutaisi', countryCode: 'GE', countryLabel: 'Georgia', aliases: ['kutaisi'] },
  // Marocco
  { iata: 'RAK', name: 'Menara', city: 'Marrakech', countryCode: 'MA', countryLabel: 'Marocco', aliases: ['marrakesh'] },
  { iata: 'CMN', name: 'Mohammed V', city: 'Casablanca', countryCode: 'MA', countryLabel: 'Marocco' },
  { iata: 'AGA', name: 'Al Massira', city: 'Agadir', countryCode: 'MA', countryLabel: 'Marocco' },
  { iata: 'TNG', name: 'Ibn Battouta', city: 'Tangeri', countryCode: 'MA', countryLabel: 'Marocco', aliases: ['tangier'] },
  // Croazia
  { iata: 'ZAG', name: 'Franjo Tuđman', city: 'Zagabria', countryCode: 'HR', countryLabel: 'Croazia', aliases: ['zagreb'] },
  { iata: 'SPU', name: 'Split', city: 'Spalato', countryCode: 'HR', countryLabel: 'Croazia', aliases: ['split'] },
  { iata: 'DBV', name: 'Dubrovnik', city: 'Dubrovnik', countryCode: 'HR', countryLabel: 'Croazia' },
  // Repubblica Ceca
  { iata: 'PRG', name: 'Václav Havel', city: 'Praga', countryCode: 'CZ', countryLabel: 'Repubblica Ceca', aliases: ['prague'] },
  // Malta
  { iata: 'MLA', name: 'Malta Intl', city: 'Malta', countryCode: 'MT', countryLabel: 'Malta', aliases: ['la valletta'] },
];

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['']/g, '')
    .replace(/\s+/g, ' ');
}

const AIRPORT_BY_IATA = new Map(AIRPORTS.map((a) => [a.iata, a]));

function uniqueCountries(): CountryDef[] {
  const seen = new Set<string>();
  return COUNTRIES.filter((c) => {
    if (seen.has(c.code)) return false;
    seen.add(c.code);
    return true;
  });
}

function buildCitySuggestions(): PlaceSuggestion[] {
  const byCity = new Map<string, PlaceSuggestion>();
  for (const a of AIRPORTS) {
    const cityKey = `${a.countryCode}:${normalize(a.city)}`;
    if (byCity.has(cityKey)) continue;
    const code = a.cityIata ?? a.iata;
    byCity.set(cityKey, {
      id: `city:${code}:${a.city}`,
      kind: 'city',
      label: a.city,
      sublabel: `${a.countryLabel} · codice ${code}`,
      code,
      countryCode: a.countryCode,
      countryLabel: a.countryLabel,
    });
  }
  return [...byCity.values()];
}

function buildAirportSuggestions(): PlaceSuggestion[] {
  return AIRPORTS.map((a) => ({
    id: `airport:${a.iata}`,
    kind: 'airport' as const,
    label: a.city,
    sublabel: `${a.name} (${a.iata}) · ${a.countryLabel}`,
    code: a.iata,
    countryCode: a.countryCode,
    countryLabel: a.countryLabel,
  }));
}

function buildCountrySuggestions(): PlaceSuggestion[] {
  return uniqueCountries().map((c) => ({
    id: `country:${c.code}`,
    kind: 'country' as const,
    label: c.label,
    sublabel: `${c.airports.length} aeroporti principali`,
    code: c.code,
    countryCode: c.code,
    countryLabel: c.label,
    multiAirport: true,
  }));
}

const CITY_SUGGESTIONS = buildCitySuggestions();
const AIRPORT_SUGGESTIONS = buildAirportSuggestions();
const COUNTRY_SUGGESTIONS = buildCountrySuggestions();

function scoreMatch(query: string, ...tokens: string[]): number | null {
  const q = normalize(query);
  if (!q) return null;
  let best: number | null = null;
  for (const raw of tokens) {
    const t = normalize(raw);
    if (!t) continue;
    if (t === q) best = Math.min(best ?? 0, 0);
    else if (t.startsWith(q)) best = Math.min(best ?? 10, 10 + (t.length - q.length));
    else if (q.length >= 3 && t.includes(q)) best = Math.min(best ?? 40, 40);
  }
  return best;
}

function tokensForAirport(a: AirportDef): string[] {
  return [a.iata, a.name, a.city, a.cityIata ?? '', a.countryLabel, ...(a.aliases ?? [])];
}

function tokensForCountry(c: CountryDef): string[] {
  return [c.code, c.label, ...c.aliases];
}

/** Aeroporti di un paese (per dropdown quando si digita il paese). */
export function airportsInCountry(countryCodeOrName: string): PlaceSuggestion[] {
  const q = normalize(countryCodeOrName);
  const country = uniqueCountries().find(
    (c) =>
      c.code.toLowerCase() === q ||
      normalize(c.label) === q ||
      c.aliases.some((a) => normalize(a) === q) ||
      c.aliases.some((a) => normalize(a).startsWith(q) && q.length >= 3)
  );
  if (!country) return [];
  return country.airports
    .map((iata) => AIRPORT_BY_IATA.get(iata))
    .filter((a): a is AirportDef => Boolean(a))
    .map((a) => ({
      id: `airport:${a.iata}`,
      kind: 'airport' as const,
      label: a.city,
      sublabel: `${a.name} (${a.iata}) · ${a.countryLabel}`,
      code: a.iata,
      countryCode: a.countryCode,
      countryLabel: a.countryLabel,
    }));
}

/**
 * Suggerimenti autocomplete.
 * - Paese (es. "giappone") → elenco aeroporti di quel paese (+ opzione tutti)
 * - Prefisso città (es. "toky") → Tokyo / aeroporti Tokyo
 */
export function searchPlaceSuggestions(query: string, limit = 10): PlaceSuggestion[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  // Match paese esatto / prefisso forte → mostra aeroporti
  const countryHit = uniqueCountries().find((c) => {
    const tokens = tokensForCountry(c);
    return tokens.some((t) => {
      const n = normalize(t);
      return n === q || (q.length >= 3 && (n.startsWith(q) || q.startsWith(n)));
    });
  });

  const countryExact =
    countryHit &&
    (normalize(countryHit.label) === q ||
      countryHit.aliases.some((a) => normalize(a) === q) ||
      (q.length >= 3 &&
        (normalize(countryHit.label).startsWith(q) ||
          countryHit.aliases.some((a) => normalize(a).startsWith(q)))));

  if (countryExact && countryHit) {
    const allOption: PlaceSuggestion = {
      id: `country:${countryHit.code}:all`,
      kind: 'country',
      label: countryHit.label,
      sublabel: `Tutti gli aeroporti · ${countryHit.airports.join(', ')}`,
      code: countryHit.code,
      countryCode: countryHit.code,
      countryLabel: countryHit.label,
      multiAirport: true,
    };
    const airports = airportsInCountry(countryHit.code);
    return [allOption, ...airports].slice(0, limit + 4);
  }

  type Ranked = { place: PlaceSuggestion; score: number };
  const ranked: Ranked[] = [];

  for (const place of CITY_SUGGESTIONS) {
    const s = scoreMatch(q, place.label, place.code, place.countryLabel);
    if (s != null) ranked.push({ place, score: s });
  }
  for (const place of AIRPORT_SUGGESTIONS) {
    const a = AIRPORT_BY_IATA.get(place.code);
    const s = scoreMatch(q, place.label, place.code, place.sublabel, ...(a ? tokensForAirport(a) : []));
    if (s != null) ranked.push({ place, score: s + 1 });
  }
  for (const place of COUNTRY_SUGGESTIONS) {
    const c = uniqueCountries().find((x) => x.code === place.code);
    const s = scoreMatch(q, place.label, place.code, ...(c ? c.aliases : []));
    if (s != null) ranked.push({ place, score: s + 5 });
  }

  ranked.sort((a, b) => a.score - b.score || a.place.label.localeCompare(b.place.label));

  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const { place } of ranked) {
    if (seen.has(place.id)) continue;
    seen.add(place.id);
    out.push(place);
    if (out.length >= limit) break;
  }
  return out;
}

/** Risolve solo match esatti (label / IATA / paese), mai prefissi parziali tipo "toky". */
export function resolvePlaceExact(query: string): PlaceSuggestion | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const withCode = trimmed.match(/^(.+?)\s*\(([A-Za-z]{3})\)$/);
  if (withCode) {
    const iata = withCode[2].toUpperCase();
    const airport = AIRPORT_SUGGESTIONS.find((p) => p.code === iata);
    if (airport) return airport;
  }

  const q = normalize(trimmed);

  if (/^[a-z]{3}$/.test(q)) {
    const airport = AIRPORT_SUGGESTIONS.find((p) => p.code.toLowerCase() === q);
    if (airport) return airport;
    const city = CITY_SUGGESTIONS.find((p) => p.code.toLowerCase() === q);
    if (city) return city;
  }

  const city = CITY_SUGGESTIONS.find((p) => normalize(p.label) === q);
  if (city) return city;

  const airport = AIRPORT_SUGGESTIONS.find(
    (p) => normalize(p.label) === q || p.code.toLowerCase() === q
  );
  if (airport) return airport;

  const country = COUNTRY_SUGGESTIONS.find(
    (p) =>
      normalize(p.label) === q ||
      uniqueCountries()
        .find((c) => c.code === p.code)
        ?.aliases.some((a) => normalize(a) === q)
  );
  return country ?? null;
}

export type AirportInfo = {
  iata: string;
  /** Nome aeroporto (es. "Kingsford Smith") */
  name: string;
  city: string;
  countryCode: string;
  countryLabel: string;
  /** Etichetta pronta per UI/prompt: "Sydney Kingsford Smith (SYD)" */
  label: string;
};

function toAirportInfo(a: AirportDef): AirportInfo {
  return {
    iata: a.iata,
    name: a.name,
    city: a.city,
    countryCode: a.countryCode,
    countryLabel: a.countryLabel,
    label: `${a.city} ${a.name} (${a.iata})`,
  };
}

export function findAirportByIata(iata: string): AirportInfo | null {
  const def = AIRPORT_BY_IATA.get(iata.trim().toUpperCase());
  return def ? toAirportInfo(def) : null;
}

/** Aeroporti che servono una città (match esatto su nome città o alias). */
export function findAirportsForCity(city: string): AirportInfo[] {
  const q = normalize(city);
  if (!q) return [];
  return AIRPORTS.filter(
    (a) =>
      normalize(a.city) === q ||
      (a.aliases ?? []).some((alias) => normalize(alias) === q)
  ).map(toAirportInfo);
}

/** Hub principali di un paese, in ordine di importanza (primo = hub primario). */
export function primaryAirportsForCountry(
  countryCodeOrName: string,
  limit = 3
): AirportInfo[] {
  const q = normalize(countryCodeOrName);
  const country = uniqueCountries().find(
    (c) =>
      c.code.toLowerCase() === q ||
      normalize(c.label) === q ||
      c.aliases.some((a) => normalize(a) === q)
  );
  if (!country) return [];
  return country.airports
    .map((iata) => AIRPORT_BY_IATA.get(iata))
    .filter((a): a is AirportDef => Boolean(a))
    .map(toAirportInfo)
    .slice(0, limit);
}

/** true se il testo è (solo) il nome/codice di un paese, non una città. */
export function matchCountryOnly(value: string): { code: string; label: string } | null {
  const q = normalize(value);
  if (!q) return null;
  const country = uniqueCountries().find(
    (c) =>
      c.code.toLowerCase() === q ||
      normalize(c.label) === q ||
      c.aliases.some((a) => normalize(a) === q)
  );
  return country ? { code: country.code, label: country.label } : null;
}

export function placeDisplayValue(place: PlaceSuggestion): string {
  if (place.kind === 'airport') return `${place.label} (${place.code})`;
  if (place.kind === 'country') return place.label;
  return place.label;
}
