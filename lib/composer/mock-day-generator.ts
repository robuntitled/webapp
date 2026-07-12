import { createEmptyBlock } from '@/lib/composer/blocks';
import type { ComposerBlock, ComposerBlockType } from '@/types/composer';

type MockDayContext = {
  destination: string;
  destinationMeta?: { label?: string; countryCode?: string };
  dayIndex: number;
  totalDays: number;
  planningMode: 'solo' | 'group';
};

type MockBlockSpec = {
  type: ComposerBlockType;
  title: string;
  timeSlot: string;
  extra?: Record<string, unknown>;
};

const DESTINATION_THEMES: Record<string, { places: string[]; foods: string[]; activities: string[] }> = {
  thailandia: {
    places: ['Tempio Wat Pho', 'Mercato Chatuchak', 'Quartiere storico'],
    foods: ['Street food su Khao San', 'Pad thai in rosticceria locale'],
    activities: ['Tour in longtail boat', 'Lezione di cucina thai'],
  },
  sicilia: {
    places: ['Centro storico', 'Mercato del pesce', 'Belvedere panoramico'],
    foods: ['Granita e brioscia', 'Trattoria con pesce fresco'],
    activities: ['Giro in barca', 'Degustazione vini etnei'],
  },
  marche: {
    places: ['Centro storico', 'Colline del Maceratese', 'Mercato contadino'],
    foods: ['Olive ascolane', 'Vincisgrassi in trattoria locale'],
    activities: ['Passeggiata panoramica', 'Visita cantina'],
  },
  italia: {
    places: ['Centro storico del borgo', 'Punto panoramico', 'Mercato locale'],
    foods: ['Pranzo in osteria tipica', 'Aperitivo in piazza'],
    activities: ['Tour a piedi del centro', 'Esperienza enogastronomica'],
  },
  giappone: {
    places: ['Tempio locale', 'Quartiere tradizionale', 'Giardino zen'],
    foods: ['Ramen artigianale', 'Izakaya nel centro'],
    activities: ['Passeggiata culturale', 'Workshop ceramica'],
  },
  default: {
    places: ['Centro storico', 'Punto panoramico', 'Mercato locale'],
    foods: ['Pranzo tipico in trattoria', 'Cena in zona centrale'],
    activities: ['Walking tour', 'Esperienza guidata'],
  },
};

function resolveTheme(destination: string, countryCode?: string) {
  const lower = destination.toLowerCase();
  const key = lower.split(/[,\s]/)[0] ?? '';
  for (const [name, theme] of Object.entries(DESTINATION_THEMES)) {
    if (name === 'default' || name === 'italia') continue;
    if (key.includes(name) || lower.includes(name)) return theme;
  }
  if (countryCode === 'IT' || lower.includes('italia') || lower.includes('marche')) {
    return DESTINATION_THEMES.marche;
  }
  return DESTINATION_THEMES.default;
}

function specsForDay(ctx: MockDayContext): { title: string; specs: MockBlockSpec[] } {
  const theme = resolveTheme(ctx.destination, ctx.destinationMeta?.countryCode);
  const dest = ctx.destinationMeta?.label ?? ctx.destination;
  const isFirst = ctx.dayIndex === 1;
  const isLast = ctx.dayIndex === ctx.totalDays;

  const isItaly =
    ctx.destinationMeta?.countryCode === 'IT' ||
    /italia|marche|sicilia|lombardia|toscana|lazio|campania/i.test(ctx.destination);
  const arrivalAirport = isItaly ? 'Ancona (AOI)' : 'Aeroporto più vicino';

  if (isFirst) {
    return {
      title: `Arrivo a ${dest}`,
      specs: [
        {
          type: 'flight',
          title: `Volo per ${arrivalAirport}`,
          timeSlot: 'morning',
          extra: { origin: 'ROM', destination: arrivalAirport },
        },
        {
          type: 'transport',
          title: `Transfer ${arrivalAirport} → ${dest}`,
          timeSlot: 'afternoon',
          extra: { from: arrivalAirport, to: dest },
        },
        { type: 'hotel', title: 'Check-in e sistemazione', timeSlot: 'afternoon' },
        { type: 'meal', title: theme.foods[0], timeSlot: 'evening', extra: { place: theme.foods[0] } },
        { type: 'free_time', title: 'Passeggiata serale', timeSlot: 'evening' },
      ],
    };
  }

  if (isLast) {
    return {
      title: `Partenza da ${dest}`,
      specs: [
        { type: 'meal', title: 'Colazione e check-out', timeSlot: 'morning' },
        { type: 'transport', title: 'Transfer verso aeroporto', timeSlot: 'morning', extra: { from: 'Hotel', to: 'Aeroporto' } },
        { type: 'flight', title: 'Volo di ritorno', timeSlot: 'afternoon' },
      ],
    };
  }

  return {
    title: `Esplorazione — giorno ${ctx.dayIndex}`,
    specs: [
      {
        type: 'attraction',
        title: theme.places[0],
        timeSlot: 'morning',
        extra: { place: theme.places[0], duration: '2h' },
      },
      { type: 'meal', title: theme.foods[1] ?? theme.foods[0], timeSlot: 'afternoon', extra: { place: theme.foods[1] ?? theme.foods[0] } },
      {
        type: 'activity',
        title: theme.activities[0],
        timeSlot: 'afternoon',
        extra: { description: theme.activities[0], duration: '3h' },
      },
      {
        type: 'attraction',
        title: theme.places[1] ?? theme.places[0],
        timeSlot: 'evening',
        extra: { place: theme.places[1] ?? theme.places[0], duration: '1h 30m' },
      },
      {
        type: 'note',
        title: 'Promemoria crew',
        timeSlot: 'flex',
        extra: {
          body:
            ctx.planningMode === 'group'
              ? 'Confermate orari e budget con il gruppo prima della serata.'
              : 'Ricorda di salvare i biglietti e gli indirizzi in offline.',
        },
      },
    ],
  };
}

/** Genera blocchi mock — sostituibile da LLM senza cambiare il contratto UI */
export function generateMockDayBlocks(
  ctx: MockDayContext & { destinationMeta?: { label?: string } },
  targetTypes?: ComposerBlockType[]
): { suggestedTitle: string; blocks: ComposerBlock[] } {
  const { title, specs } = specsForDay(ctx);
  const filtered = targetTypes?.length
    ? specs.filter((s) => targetTypes.includes(s.type))
    : specs;

  const blocks = filtered.map((spec, i) =>
    createEmptyBlock(spec.type, i, {
      title: spec.title,
      timeSlot: spec.timeSlot,
      ...spec.extra,
    })
  );

  return { suggestedTitle: title, blocks };
}