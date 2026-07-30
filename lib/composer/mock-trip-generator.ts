import { createBlockId, createEmptyBlock } from '@/lib/composer/blocks';
import { pickRotated, resolveDestinationIntel } from '@/lib/composer/destination-intel';
import type { DestinationContext } from '@/lib/composer/destination-context';
import type {
  ComposerBlock,
  ComposerBlockType,
  ComposerTripDayResult,
  ComposerTripGenerateRequest,
} from '@/types/composer';

export type MockTripContext = {
  req: ComposerTripGenerateRequest;
  destination: DestinationContext;
  originIata: string;
  originCity?: string;
  roundtrip: boolean;
};

type Spec = {
  type: ComposerBlockType;
  title: string;
  timeSlot: string;
  extra?: Record<string, unknown>;
};

function specsToBlocks(specs: Spec[]): ComposerBlock[] {
  return specs.map((spec, i) =>
    createEmptyBlock(spec.type, i, {
      title: spec.title,
      timeSlot: spec.timeSlot,
      ...spec.extra,
    })
  );
}

function arrivalLabel(ctx: MockTripContext): string {
  return ctx.destination.airport?.label ?? `${ctx.destination.cityLabel} — aeroporto da confermare`;
}

/**
 * Blocchi smart per una singola giornata, coerenti con la fase del viaggio.
 * Usato sia dal mock completo sia per tappare i giorni che l'AI ha saltato.
 */
export function buildSmartDaySpecs(
  ctx: MockTripContext,
  dayIndex: number,
  totalDays: number
): { title: string; specs: Spec[] } {
  const intel = resolveDestinationIntel(ctx.req.destination, ctx.req.destinationMeta);
  const city = ctx.destination.cityLabel;
  const airport = ctx.destination.airport;
  const isFirst = dayIndex === 1;
  const isLast = dayIndex === totalDays && totalDays > 1;

  if (isFirst) {
    return {
      title: `Arrivo a ${city}`,
      specs: [
        {
          type: 'flight',
          title: airport
            ? `Volo ${ctx.originIata} → ${airport.label}`
            : `Volo ${ctx.originIata} → ${city}`,
          timeSlot: 'morning',
          extra: {
            origin: ctx.originIata,
            destination: airport?.iata,
            originLabel: ctx.originCity,
            needsAirport: !airport,
          },
        },
        {
          type: 'transport',
          title: `Transfer ${arrivalLabel(ctx)} → centro ${city}`,
          timeSlot: 'afternoon',
          extra: { from: arrivalLabel(ctx), to: city, mode: 'taxi', duration: '45m' },
        },
        {
          type: 'meal',
          title: pickRotated(intel.foods, dayIndex, 0),
          timeSlot: 'evening',
          extra: { place: city, cuisine: intel.region, duration: '1h 30m' },
        },
        {
          type: 'free_time',
          title: `Prima passeggiata — ${pickRotated(intel.places, dayIndex, 1)}`,
          timeSlot: 'evening',
          extra: { note: 'Orientati nel quartiere senza orari rigidi', duration: '1h 30m' },
        },
      ],
    };
  }

  if (isLast) {
    const specs: Spec[] = [
      {
        type: 'meal',
        title: `Colazione — ${pickRotated(intel.foods, dayIndex, 3)}`,
        timeSlot: 'morning',
        extra: { place: city, duration: '1h' },
      },
      {
        type: 'transport',
        title: `Transfer centro ${city} → ${arrivalLabel(ctx)}`,
        timeSlot: 'afternoon',
        extra: { from: city, to: arrivalLabel(ctx), mode: 'taxi', duration: '45m' },
      },
    ];

    if (ctx.roundtrip) {
      specs.push({
        type: 'flight',
        title: airport
          ? `Volo ${airport.iata} → ${ctx.originIata}`
          : `Volo di rientro → ${ctx.originIata}`,
        timeSlot: 'afternoon',
        extra: {
          origin: airport?.iata,
          destination: ctx.originIata,
          originLabel: ctx.originCity,
          needsAirport: !airport,
          returnLeg: true,
        },
      });
    } else {
      specs.push({
        type: 'note',
        title: 'Prosecuzione viaggio',
        timeSlot: 'flex',
        extra: {
          body: 'Nessun volo di rientro in questo itinerario: aggiungi il trasferimento verso la tappa successiva.',
        },
      });
    }

    return { title: `Partenza da ${city}`, specs };
  }

  const morningPlace = pickRotated(intel.places, dayIndex, 0);
  const eveningPlace = pickRotated(intel.places, dayIndex, 2);

  return {
    title: `${pickRotated(intel.dayTitleHints, dayIndex)} — ${city}`,
    specs: [
      {
        type: 'attraction',
        title: morningPlace,
        timeSlot: 'morning',
        extra: { place: morningPlace, duration: '2h 30m' },
      },
      {
        type: 'meal',
        title: pickRotated(intel.foods, dayIndex, 1),
        timeSlot: 'afternoon',
        extra: { place: city, cuisine: intel.region, duration: '1h 30m' },
      },
      {
        type: 'activity',
        title: pickRotated(intel.activities, dayIndex, 0),
        timeSlot: 'afternoon',
        extra: { description: pickRotated(intel.activities, dayIndex, 0), duration: '3h' },
      },
      {
        type: 'attraction',
        title: eveningPlace,
        timeSlot: 'evening',
        extra: { place: eveningPlace, duration: '1h 30m' },
      },
    ],
  };
}

/** Itinerario completo senza LLM — sempre disponibile come fallback. */
export function generateMockTrip(ctx: MockTripContext): {
  tripTitle: string;
  days: ComposerTripDayResult[];
} {
  const totalDays = ctx.req.days.length;

  const days: ComposerTripDayResult[] = ctx.req.days.map((day) => {
    const { title, specs } = buildSmartDaySpecs(ctx, day.dayIndex, totalDays);
    return {
      dayIndex: day.dayIndex,
      date: day.date,
      suggestedTitle: title,
      blocks: specsToBlocks(specs),
    };
  });

  return {
    tripTitle: `${ctx.destination.cityLabel} in ${totalDays} ${totalDays === 1 ? 'giorno' : 'giorni'}`,
    days: applyStayBlocks(days, ctx),
  };
}

/**
 * Garantisce check-in (giorno 1) e check-out (ultimo giorno) collegati allo stesso
 * soggiorno, rispettando il modello hotelPhase/hotelRootId usato dal composer.
 */
export function applyStayBlocks(
  days: ComposerTripDayResult[],
  ctx: MockTripContext
): ComposerTripDayResult[] {
  if (days.length < 2) return days;

  const first = days[0];
  const last = days[days.length - 1];
  const nights = last.dayIndex - first.dayIndex;
  if (nights < 1) return days;

  const area = ctx.destination.cityLabel;
  const rootId = createBlockId();

  const existingCheckIn = first.blocks.find(
    (b) => b.type === 'hotel' && b.content.hotelPhase !== 'checkout'
  );

  const checkIn: ComposerBlock = existingCheckIn
    ? {
        ...existingCheckIn,
        content: {
          ...existingCheckIn.content,
          hotelPhase: 'checkin',
          hotelRootId: rootId,
          nights,
          area: existingCheckIn.content.area ?? area,
          checkInTime: existingCheckIn.content.checkInTime ?? '14:00',
          checkOutTime: existingCheckIn.content.checkOutTime ?? '11:00',
          checkInDate: first.date,
          checkOutDate: last.date,
          time: existingCheckIn.content.checkInTime ?? '14:00',
          duration: `${nights} ${nights === 1 ? 'notte' : 'notti'}`,
        },
      }
    : createEmptyBlock('hotel', first.blocks.length, {
        title: `Check-in alloggio — ${area}`,
        area,
        place: area,
        timeSlot: 'afternoon',
        hotelPhase: 'checkin',
        hotelRootId: rootId,
        nights,
        checkInTime: '14:00',
        checkOutTime: '11:00',
        checkInDate: first.date,
        checkOutDate: last.date,
        time: '14:00',
        duration: `${nights} ${nights === 1 ? 'notte' : 'notti'}`,
      });

  const checkOut = createEmptyBlock('hotel', 0, {
    title: typeof checkIn.content.title === 'string' ? checkIn.content.title : `Alloggio ${area}`,
    area,
    place: typeof checkIn.content.place === 'string' ? checkIn.content.place : area,
    timeSlot: 'morning',
    hotelPhase: 'checkout',
    hotelRootId: rootId,
    nights,
    checkInTime: checkIn.content.checkInTime ?? '14:00',
    checkOutTime: checkIn.content.checkOutTime ?? '11:00',
    checkInDate: first.date,
    checkOutDate: last.date,
    time: checkIn.content.checkOutTime ?? '11:00',
    price: null,
  });

  return days.map((day) => {
    if (day.dayIndex === first.dayIndex) {
      const withoutHotels = day.blocks.filter((b) => b.type !== 'hotel');
      // Check-in dopo il transfer dall'aeroporto, prima di cena
      const insertAt = Math.max(
        0,
        withoutHotels.findIndex((b) => b.type === 'meal' || b.type === 'free_time')
      );
      const ordered = [
        ...withoutHotels.slice(0, insertAt || withoutHotels.length),
        checkIn,
        ...withoutHotels.slice(insertAt || withoutHotels.length),
      ];
      return { ...day, blocks: ordered.map((b, i) => ({ ...b, sortOrder: i })) };
    }

    if (day.dayIndex === last.dayIndex) {
      const withoutHotels = day.blocks.filter((b) => b.type !== 'hotel');
      return {
        ...day,
        blocks: [checkOut, ...withoutHotels].map((b, i) => ({ ...b, sortOrder: i })),
      };
    }

    // Giorni intermedi: nessun blocco hotel duplicato
    return {
      ...day,
      blocks: day.blocks
        .filter((b) => b.type !== 'hotel')
        .map((b, i) => ({ ...b, sortOrder: i })),
    };
  });
}
