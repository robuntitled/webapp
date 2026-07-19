import { describe, expect, it } from 'vitest';
import { createEmptyBlock } from '@/lib/composer/blocks';
import { removeComposerDay } from '@/lib/composer/days';
import {
  isHotelCheckoutBlock,
  resyncAllHotelCheckouts,
  syncHotelCheckoutBlocks,
} from '@/lib/composer/hotel-checkout-sync';
import type { ComposerDay } from '@/types/composer';

function emptyDay(dayIndex: number, date: string): ComposerDay {
  return { dayIndex, date, title: `Giorno ${dayIndex}`, blocks: [] };
}

describe('resyncAllHotelCheckouts', () => {
  it('ricrea checkout sul giorno corretto dopo rimozione del giorno checkout', () => {
    let days: ComposerDay[] = [
      emptyDay(1, '2026-08-01'),
      emptyDay(2, '2026-08-02'),
      emptyDay(3, '2026-08-03'),
    ];

    const hotel = createEmptyBlock('hotel', 0, {
      title: 'Hotel Roma',
      hotelPhase: 'checkin',
      nights: 1,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      time: '14:00',
    });

    days = days.map((d) =>
      d.dayIndex === 1 ? { ...d, blocks: [hotel] } : d
    );

    const synced = syncHotelCheckoutBlocks(days, 1, hotel);
    days = synced.days;

    // checkout sul giorno 2
    expect(days[1].blocks.some(isHotelCheckoutBlock)).toBe(true);

    // Elimina giorno 2 (quello del checkout)
    const compacted = removeComposerDay(days, 2);
    // Ora restano giorno 1 e ex-giorno 3 → dayIndex 1 e 2
    expect(compacted).toHaveLength(2);

    const resynced = resyncAllHotelCheckouts(compacted);
    // check-in giorno 1 + 1 notte → checkout sul nuovo giorno 2
    const day2 = resynced.days.find((d) => d.dayIndex === 2);
    expect(day2).toBeTruthy();
    expect(day2!.blocks.some(isHotelCheckoutBlock)).toBe(true);
    // non deve restare solo sul check-in senza checkout
    const day1 = resynced.days.find((d) => d.dayIndex === 1);
    expect(day1!.blocks.some((b) => b.type === 'hotel' && !isHotelCheckoutBlock(b))).toBe(
      true
    );
  });

  it('rimuove checkout orfani se il check-in non c’è più', () => {
    let days: ComposerDay[] = [
      emptyDay(1, '2026-08-01'),
      emptyDay(2, '2026-08-02'),
    ];

    const hotel = createEmptyBlock('hotel', 0, {
      title: 'Hotel',
      hotelPhase: 'checkin',
      nights: 1,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      time: '14:00',
    });
    days = days.map((d) =>
      d.dayIndex === 1 ? { ...d, blocks: [hotel] } : d
    );
    days = syncHotelCheckoutBlocks(days, 1, hotel).days;
    expect(days[1].blocks.some(isHotelCheckoutBlock)).toBe(true);

    // Rimuovi giorno 1 (check-in)
    const compacted = removeComposerDay(days, 1);
    const resynced = resyncAllHotelCheckouts(compacted);
    // Nessun hotel rimasto
    const anyHotel = resynced.days.some((d) =>
      d.blocks.some((b) => b.type === 'hotel')
    );
    expect(anyHotel).toBe(false);
  });
});
