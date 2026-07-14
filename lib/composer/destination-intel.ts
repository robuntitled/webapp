export type DestinationIntel = {
  region: string;
  vibe: string;
  nearestAirport: { iata: string; label: string };
  hubCity: string;
  places: string[];
  foods: string[];
  activities: string[];
  dayTitleHints: string[];
};

const ITALY_HUB: DestinationIntel = {
  region: 'Italia',
  vibe: 'borghi, colline e mare adriatico',
  nearestAirport: { iata: 'AOI', label: 'Ancona Falconara (AOI)' },
  hubCity: 'Ancona',
  places: [
    'Centro storico e belvedere',
    'Mercato contadino locale',
    'Borgo panoramico tra colline',
    'Santuario o chiesa storica del territorio',
    'Strada del vino e dei sapori',
  ],
  foods: [
    'Olive ascolane in friggitoria locale',
    'Vincisgrassi o pasta al forno marchigiana',
    'Cena in osteria di paese',
    'Colazione con cornetto e caffè in bar',
    'Aperitivo in piazza con vino dei colli',
  ],
  activities: [
    'Passeggiata tra vicoli e mura storiche',
    'Giro in collina al tramonto',
    'Degustazione in cantina o frantoio',
    'Bike tour tra borghi',
    'Visita mercato del mercoledì',
  ],
  dayTitleHints: [
    'Cuore del territorio',
    'Sapori e colline',
    'Borghi e panorami',
    'Cultura locale',
    'Slow day in campagna',
  ],
};

const REGION_INTEL: Record<string, Partial<DestinationIntel>> = {
  marche: {
    region: 'Marche',
    vibe: 'colline, borghi medievali e costa adriatica',
    hubCity: 'Macerata',
    places: [
      'Centro storico di Monte San Giusto',
      'Belvedere sulla valle del Potenza',
      'Loreto e zona collinare',
      'Civitanova Marche — passeggiata sul porto',
      'Colline del Maceratese',
    ],
    foods: [
      'Olive ascolane in friggitoria',
      'Vincisgrassi in trattoria tipica',
      'Brodetto o pesce adriatico',
      'Formaggi di pecora locali',
      'Crescia marchigiana con salumi',
    ],
    activities: [
      'Tour del borgo medievale',
      'Escursione soft tra vigneti',
      'Visita al santuario di Loreto (mezza giornata)',
      'Serata in piazza con musica live',
      'Mercato contadino e prodotti km0',
    ],
  },
  sicilia: {
    region: 'Sicilia',
    vibe: 'mare, vulcani e cucina intensa',
    nearestAirport: { iata: 'CTA', label: 'Catania (CTA)' },
    hubCity: 'Palermo',
    places: ['Centro storico barocco', 'Mercato del pesce', 'Belvedere Etna o mare'],
    foods: ['Granita e brioscia', 'Arancino artigianale', 'Pesce alla griglia'],
    activities: ['Giro in barca', 'Degustazione vini etnei', 'Passeggiata serale sul lungomare'],
  },
  thailandia: {
    region: 'Thailandia',
    vibe: 'templi, street food e mercati notturni',
    nearestAirport: { iata: 'BKK', label: 'Bangkok Suvarnabhumi (BKK)' },
    hubCity: 'Bangkok',
    places: ['Tempio Wat Pho', 'Mercato Chatuchak', 'Quartiere storico'],
    foods: ['Pad thai in rosticceria', 'Street food su Khao San', 'Mango sticky rice'],
    activities: ['Tour longtail boat', 'Lezione cucina thai', 'Massaggio tradizionale'],
  },
  giappone: {
    region: 'Giappone',
    vibe: 'templi, quartieri tradizionali e precisione',
    nearestAirport: { iata: 'NRT', label: 'Tokyo Narita (NRT)' },
    hubCity: 'Tokyo',
    places: ['Tempio locale', 'Quartiere tradizionale', 'Giardino zen'],
    foods: ['Ramen artigianale', 'Izakaya nel centro', 'Matcha e wagashi'],
    activities: ['Passeggiata culturale', 'Workshop ceramica', 'Onsen o relax urbano'],
  },
};

function detectRegionKey(destination: string, countryCode?: string, country?: string): string | null {
  const lower = destination.toLowerCase();
  if (countryCode === 'IT' || country?.toLowerCase().includes('italia') || lower.includes('italia')) {
    if (lower.includes('marche') || lower.includes('monte san giusto') || lower.includes('macerata') || lower.includes('ancona') || lower.includes('ascoli')) {
      return 'marche';
    }
    return 'marche';
  }
  for (const key of Object.keys(REGION_INTEL)) {
    if (lower.includes(key)) return key;
  }
  return null;
}

export function resolveDestinationIntel(
  destination: string,
  meta?: {
    label?: string;
    country?: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
  }
): DestinationIntel {
  const regionKey = detectRegionKey(destination, meta?.countryCode, meta?.country);
  const base = regionKey === 'marche' || meta?.countryCode === 'IT'
    ? { ...ITALY_HUB, ...REGION_INTEL.marche }
    : { ...ITALY_HUB };

  const regional = regionKey ? REGION_INTEL[regionKey] : undefined;
  const merged: DestinationIntel = {
    ...base,
    ...regional,
    places: regional?.places ?? base.places,
    foods: regional?.foods ?? base.foods,
    activities: regional?.activities ?? base.activities,
    dayTitleHints: regional?.dayTitleHints ?? base.dayTitleHints,
  };

  const label = meta?.label ?? destination.split(',')[0]?.trim() ?? destination;
  if (!regionKey && meta?.countryCode !== 'IT') {
    return {
      region: meta?.country ?? 'Destinazione',
      vibe: 'esplorazione urbana e locale',
      nearestAirport: { iata: 'ROM', label: 'Aeroporto internazionale più vicino' },
      hubCity: label,
      places: [
        `Centro storico di ${label}`,
        'Mercato o quartiere autentico',
        'Punto panoramico',
        'Museo o sito culturale',
        'Zona gastronomica consigliata',
      ],
      foods: [
        `Pranzo tipico a ${label}`,
        'Street food o specialità locale',
        'Cena in zona centrale',
        'Colazione in caffè locale',
        'Aperitivo con vista',
      ],
      activities: [
        'Walking tour del centro',
        'Esperienza guidata mezza giornata',
        'Tempo libero per foto e shopping',
        'Tour gastronomico',
        'Tramonto in punto panoramico',
      ],
      dayTitleHints: ['Scoperta', 'Immersione locale', 'Highlight', 'Giornata slow', 'Extra'],
    };
  }

  return merged;
}

export function pickRotated<T>(items: T[], dayIndex: number, offset = 0): T {
  return items[(dayIndex + offset) % items.length]!;
}

export function buildIntelPromptBlock(intel: DestinationIntel, destLabel: string): string {
  return [
    `${intel.region}: ${intel.vibe}`,
    `airport=${intel.nearestAirport.iata}`,
    `hub=${intel.hubCity}`,
    `places=${intel.places.slice(0, 3).join(', ')}`,
    `food=${intel.foods.slice(0, 2).join(', ')}`,
    `dest=${destLabel}`,
  ].join('; ');
}