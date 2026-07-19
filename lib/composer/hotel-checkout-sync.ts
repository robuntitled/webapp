import { createEmptyBlock } from '@/lib/composer/blocks';
import { appendComposerDay, endDateFromDays } from '@/lib/composer/days';
import type { ComposerBlock, ComposerDay } from '@/types/composer';

export function isHotelCheckoutBlock(block: ComposerBlock): boolean {
  return block.type === 'hotel' && block.content.hotelPhase === 'checkout';
}

export function isHotelCheckinBlock(block: ComposerBlock): boolean {
  return block.type === 'hotel' && block.content.hotelPhase !== 'checkout';
}

function hotelRootId(block: ComposerBlock): string {
  if (typeof block.content.hotelRootId === 'string' && block.content.hotelRootId) {
    return block.content.hotelRootId;
  }
  return block.id;
}

/**
 * Rimuove tutti i blocchi check-out collegati a un hotel root.
 */
export function removeLinkedHotelCheckouts(
  days: ComposerDay[],
  rootId: string
): ComposerDay[] {
  return days.map((day) => ({
    ...day,
    blocks: day.blocks.filter(
      (b) =>
        !(
          b.type === 'hotel' &&
          b.content.hotelPhase === 'checkout' &&
          hotelRootId(b) === rootId
        )
    ),
  }));
}

/**
 * Dopo check-in hotel: crea/aggiorna un blocco check-out nel giorno
 * checkInDayIndex + nights (es. 1 notte → giorno successivo).
 * Estende le tab giorno se servono.
 */
export function syncHotelCheckoutBlocks(
  days: ComposerDay[],
  checkInDayIndex: number,
  hotelBlock: ComposerBlock
): { days: ComposerDay[]; endDate: string } {
  if (hotelBlock.type !== 'hotel') {
    return { days, endDate: endDateFromDays(days) };
  }

  // Non sincronizzare se stiamo editando un checkout
  if (isHotelCheckoutBlock(hotelBlock)) {
    return { days, endDate: endDateFromDays(days) };
  }

  const rootId = hotelRootId(hotelBlock);
  const nights = Math.max(1, Number(hotelBlock.content.nights) || 1);
  const checkoutDayIndex = checkInDayIndex + nights;
  const checkOutTime =
    typeof hotelBlock.content.checkOutTime === 'string' && hotelBlock.content.checkOutTime
      ? hotelBlock.content.checkOutTime
      : '11:00';
  const title =
    typeof hotelBlock.content.title === 'string' && hotelBlock.content.title
      ? hotelBlock.content.title
      : 'Hotel';
  const place =
    typeof hotelBlock.content.place === 'string' ? hotelBlock.content.place : undefined;
  const lat = typeof hotelBlock.content.lat === 'number' ? hotelBlock.content.lat : undefined;
  const lng = typeof hotelBlock.content.lng === 'number' ? hotelBlock.content.lng : undefined;
  const placeId =
    typeof hotelBlock.content.placeId === 'string' ? hotelBlock.content.placeId : undefined;
  const photoUrl =
    typeof hotelBlock.content.photoUrl === 'string' ? hotelBlock.content.photoUrl : undefined;
  const rating =
    typeof hotelBlock.content.rating === 'number' ? hotelBlock.content.rating : undefined;
  const ratingCount =
    typeof hotelBlock.content.ratingCount === 'number'
      ? hotelBlock.content.ratingCount
      : undefined;

  // 1) Rimuovi checkout precedenti per questo hotel
  let next = removeLinkedHotelCheckouts(days, rootId);

  // 2) Estendi giorni se manca la tab di checkout
  while (next.length < checkoutDayIndex) {
    next = appendComposerDay(next);
  }

  // 3) Aggiorna blocco check-in
  next = next.map((day) => {
    if (day.dayIndex !== checkInDayIndex) return day;
    return {
      ...day,
      blocks: day.blocks.map((b) => {
        if (b.id !== hotelBlock.id) return b;
        return {
          ...b,
          content: {
            ...b.content,
            ...hotelBlock.content,
            hotelPhase: 'checkin',
            hotelRootId: rootId,
            nights,
            checkOutTime,
            time: hotelBlock.content.checkInTime ?? hotelBlock.content.time ?? '14:00',
            endTime: undefined,
            checkInDate: day.date,
            checkOutDate: next.find((d) => d.dayIndex === checkoutDayIndex)?.date,
          },
        };
      }),
    };
  });

  // 4) Inserisci blocco check-out nel giorno destinazione
  const checkoutDay = next.find((d) => d.dayIndex === checkoutDayIndex);
  if (checkoutDay) {
    const checkoutBlock = createEmptyBlock('hotel', checkoutDay.blocks.length, {
      title,
      place,
      lat,
      lng,
      placeId,
      photoUrl,
      rating: rating ?? null,
      ratingCount: ratingCount ?? null,
      hotelPhase: 'checkout',
      hotelRootId: rootId,
      nights,
      checkOutTime,
      checkInTime: hotelBlock.content.checkInTime ?? '14:00',
      time: checkOutTime,
      endTime: undefined,
      checkInDate: next.find((d) => d.dayIndex === checkInDayIndex)?.date,
      checkOutDate: checkoutDay.date,
      price: hotelBlock.content.price ?? null,
    });

    next = next.map((day) => {
      if (day.dayIndex !== checkoutDayIndex) return day;
      // evita duplicati se già presente (race)
      const without = day.blocks.filter(
        (b) =>
          !(
            b.type === 'hotel' &&
            b.content.hotelPhase === 'checkout' &&
            hotelRootId(b) === rootId
          )
      );
      return { ...day, blocks: [...without, checkoutBlock] };
    });
  }

  return { days: next, endDate: endDateFromDays(next) };
}

/**
 * Dopo rimozione/aggiunta giorni (reindex): ricrea i check-out
 * sul giorno corretto (check-in + notti).
 * - Se il giorno del checkout era stato eliminato → ricompare sul giorno sostitutivo
 * - Se manca lo slot → estende le tab (syncHotelCheckoutBlocks)
 * - Check-out orfani (check-in cancellato) → rimossi
 */
export function resyncAllHotelCheckouts(days: ComposerDay[]): {
  days: ComposerDay[];
  endDate: string;
} {
  const checkIns: { dayIndex: number; blockId: string }[] = [];

  for (const day of days) {
    for (const block of day.blocks) {
      if (block.type === 'hotel' && isHotelCheckinBlock(block)) {
        checkIns.push({ dayIndex: day.dayIndex, blockId: block.id });
      }
    }
  }

  // Pulisci tutti i checkout (verranno ricreati dai check-in vivi)
  let next: ComposerDay[] = days.map((day) => ({
    ...day,
    blocks: day.blocks.filter((b) => !isHotelCheckoutBlock(b)),
  }));

  for (const { dayIndex, blockId } of checkIns) {
    const day = next.find((d) => d.dayIndex === dayIndex);
    const block = day?.blocks.find((b) => b.id === blockId);
    if (!block || block.type !== 'hotel') continue;
    const synced = syncHotelCheckoutBlocks(next, dayIndex, block);
    next = synced.days;
  }

  return { days: next, endDate: endDateFromDays(next) };
}

/**
 * Se rimuovi un check-in, togli anche i checkout collegati.
 * Se rimuovi solo un checkout, ok lasciare il check-in.
 */
export function removeHotelAndLinkedCheckouts(
  days: ComposerDay[],
  blockId: string
): ComposerDay[] {
  let rootId: string | null = null;
  let isCheckout = false;

  for (const day of days) {
    const b = day.blocks.find((x) => x.id === blockId);
    if (b && b.type === 'hotel') {
      isCheckout = isHotelCheckoutBlock(b);
      rootId = hotelRootId(b);
      break;
    }
  }

  if (!rootId) {
    return days.map((day) => ({
      ...day,
      blocks: day.blocks.filter((b) => b.id !== blockId),
    }));
  }

  if (isCheckout) {
    // Solo rimuovi quel checkout
    return days.map((day) => ({
      ...day,
      blocks: day.blocks.filter((b) => b.id !== blockId),
    }));
  }

  // Rimuovi check-in + tutti i checkout collegati
  return days.map((day) => ({
    ...day,
    blocks: day.blocks.filter((b) => {
      if (b.id === blockId) return false;
      if (
        b.type === 'hotel' &&
        b.content.hotelPhase === 'checkout' &&
        hotelRootId(b) === rootId
      ) {
        return false;
      }
      return true;
    }),
  }));
}
