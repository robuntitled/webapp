import { createEmptyBlock } from '@/lib/composer/blocks';
import {
  pickRotated,
  resolveDestinationIntel,
  type DestinationIntel,
} from '@/lib/composer/destination-intel';
import type { ComposerBlock, ComposerBlockType } from '@/types/composer';

type MockDayContext = {
  destination: string;
  destinationMeta?: {
    label?: string;
    country?: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
  };
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

function specsForDay(ctx: MockDayContext, intel: DestinationIntel): { title: string; specs: MockBlockSpec[] } {
  const dest = ctx.destinationMeta?.label ?? ctx.destination.split(',')[0]?.trim() ?? ctx.destination;
  const isFirst = ctx.dayIndex === 1;
  const isLast = ctx.dayIndex === ctx.totalDays;
  const airport = intel.nearestAirport;

  if (isFirst) {
    return {
      title: `Arrivo a ${dest}`,
      specs: [
        {
          type: 'flight',
          title: `Volo ROM → ${airport.label}`,
          timeSlot: 'morning',
          extra: { origin: 'ROM', destination: airport.iata, duration: '1h 15m' },
        },
        {
          type: 'transport',
          title: `Transfer ${airport.label} → ${dest}`,
          timeSlot: 'afternoon',
          extra: { from: airport.label, to: dest, mode: 'auto', duration: '45m' },
        },
        {
          type: 'hotel',
          title: `Check-in — ${dest}`,
          timeSlot: 'afternoon',
          extra: { area: dest, duration: '1 notte', title: `Check-in — ${dest}` },
        },
        {
          type: 'meal',
          title: pickRotated(intel.foods, ctx.dayIndex, 0),
          timeSlot: 'evening',
          extra: {
            place: dest,
            cuisine: intel.region,
            duration: '1h 30m',
          },
        },
        {
          type: 'free_time',
          title: `Passeggiata serale — ${pickRotated(intel.places, ctx.dayIndex, 1)}`,
          timeSlot: 'evening',
          extra: {
            note: 'Primo assaggio del territorio, senza orari rigidi',
            duration: '1h 30m',
          },
        },
      ],
    };
  }

  if (isLast) {
    return {
      title: `Partenza da ${dest}`,
      specs: [
        {
          type: 'meal',
          title: `Colazione — ${pickRotated(intel.foods, ctx.dayIndex, 3)}`,
          timeSlot: 'morning',
          extra: { place: dest, duration: '1h' },
        },
        {
          type: 'attraction',
          title: pickRotated(intel.places, ctx.dayIndex, 2),
          timeSlot: 'morning',
          extra: { place: pickRotated(intel.places, ctx.dayIndex, 2), duration: '1h' },
        },
        {
          type: 'transport',
          title: `Transfer ${dest} → ${airport.label}`,
          timeSlot: 'afternoon',
          extra: { from: dest, to: airport.label, mode: 'auto', duration: '45m' },
        },
        {
          type: 'flight',
          title: `Volo ${airport.iata} → ROM`,
          timeSlot: 'afternoon',
          extra: { origin: airport.iata, destination: 'ROM', duration: '1h 15m' },
        },
      ],
    };
  }

  const titleHint = pickRotated(intel.dayTitleHints, ctx.dayIndex);
  const morningPlace = pickRotated(intel.places, ctx.dayIndex, 0);
  const lunch = pickRotated(intel.foods, ctx.dayIndex, 1);
  const activity = pickRotated(intel.activities, ctx.dayIndex, 0);
  const eveningPlace = pickRotated(intel.places, ctx.dayIndex, 2);

  return {
    title: `${titleHint} — ${dest}`,
    specs: [
      {
        type: 'attraction',
        title: morningPlace,
        timeSlot: 'morning',
        extra: { place: morningPlace, duration: '2h 30m' },
      },
      {
        type: 'meal',
        title: lunch,
        timeSlot: 'afternoon',
        extra: { place: intel.hubCity, cuisine: intel.region, duration: '1h 30m' },
      },
      {
        type: 'activity',
        title: activity,
        timeSlot: 'afternoon',
        extra: { description: activity, duration: '3h' },
      },
      {
        type: 'attraction',
        title: eveningPlace,
        timeSlot: 'evening',
        extra: { place: eveningPlace, duration: '1h 30m' },
      },
      {
        type: 'note',
        title: ctx.planningMode === 'group' ? 'Sync crew' : 'Promemoria',
        timeSlot: 'flex',
        extra: {
          body:
            ctx.planningMode === 'group'
              ? `Conferma orari e budget per giorno ${ctx.dayIndex}. Condividi posizione meet-up in chat crew.`
              : `Salva offline indirizzi e biglietti per ${dest}.`,
        },
      },
    ],
  };
}

/** Genera blocchi smart locali — arricchiti da destination-intel */
export function generateMockDayBlocks(
  ctx: MockDayContext,
  targetTypes?: ComposerBlockType[]
): { suggestedTitle: string; blocks: ComposerBlock[] } {
  const intel = resolveDestinationIntel(ctx.destination, ctx.destinationMeta);
  const { title, specs } = specsForDay(ctx, intel);
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