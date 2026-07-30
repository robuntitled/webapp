import { createEmptyBlock } from '@/lib/composer/blocks';
import {
  pickRotated,
  resolveDestinationIntel,
  type DestinationIntel,
} from '@/lib/composer/destination-intel';
import { defaultOriginIata } from '@/lib/travel/origin-iata';
import type { ComposerBlock, ComposerBlockType, ComposerOrigin } from '@/types/composer';

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
  organizerOrigin?: ComposerOrigin;
  crewOrigins?: ComposerOrigin[];
};

type MockBlockSpec = {
  type: ComposerBlockType;
  title: string;
  timeSlot: string;
  extra?: Record<string, unknown>;
};

function homeIata(ctx: MockDayContext): string {
  return ctx.organizerOrigin?.iata ?? defaultOriginIata();
}

function crewArrivalNote(ctx: MockDayContext): MockBlockSpec | null {
  if (ctx.planningMode !== 'group' || !ctx.crewOrigins?.length) return null;
  const lines = ctx.crewOrigins.map((o) => `${o.city} (${o.iata})`).join(', ');
  return {
    type: 'note',
    title: 'Arrivi crew da altre città',
    timeSlot: 'flex',
    extra: {
      body: `Amici in arrivo da: ${lines}. Confermate orari volo in chat e punto meet-up in destinazione.`,
    },
  };
}

function specsForDay(ctx: MockDayContext, intel: DestinationIntel): { title: string; specs: MockBlockSpec[] } {
  const dest = ctx.destinationMeta?.label ?? ctx.destination.split(',')[0]?.trim() ?? ctx.destination;
  const isFirst = ctx.dayIndex === 1;
  const isLast = ctx.dayIndex === ctx.totalDays;
  const airport = intel.nearestAirport;
  const arrivalLabel = airport?.label ?? `${dest} — aeroporto da confermare`;
  const origin = homeIata(ctx);

  if (isFirst) {
    const crewNote = crewArrivalNote(ctx);
    return {
      title: `Arrivo a ${dest}`,
      specs: [
        {
          type: 'flight',
          title: airport ? `Volo ${origin} → ${airport.label}` : `Volo ${origin} → ${dest}`,
          timeSlot: 'morning',
          extra: {
            origin,
            destination: airport?.iata,
            needsAirport: !airport,
            duration: '1h 15m',
            originLabel: ctx.organizerOrigin?.city,
          },
        },
        {
          type: 'transport',
          title: `Transfer ${arrivalLabel} → ${dest}`,
          timeSlot: 'afternoon',
          extra: { from: arrivalLabel, to: dest, mode: 'auto', duration: '45m' },
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
        ...(crewNote ? [crewNote] : []),
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
          title: `Transfer ${dest} → ${arrivalLabel}`,
          timeSlot: 'afternoon',
          extra: { from: dest, to: arrivalLabel, mode: 'auto', duration: '45m' },
        },
        {
          type: 'flight',
          title: airport ? `Volo ${airport.iata} → ${origin}` : `Volo di rientro → ${origin}`,
          timeSlot: 'afternoon',
          extra: {
            origin: airport?.iata,
            destination: origin,
            needsAirport: !airport,
            duration: '1h 15m',
            originLabel: ctx.organizerOrigin?.city,
          },
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