import type { ComposerDayRow } from '@/lib/data/composer';
import { BLOCK_META } from '@/lib/composer/blocks';
import type { TripCartItem, TripCartKind } from '@/lib/cart/trip-cart';

const BOOKABLE: Record<string, { kind: TripCartKind; provider: string; hash: string }> = {
  flight: { kind: 'flight', provider: 'LiteAPI', hash: 'prenota-voli' },
  hotel: { kind: 'hotel', provider: 'LiteAPI', hash: 'prenota-hotel' },
  activity: { kind: 'activity', provider: 'Viator', hash: 'prenota-attivita' },
  attraction: { kind: 'attraction', provider: 'Viator', hash: 'prenota-attivita' },
  transport: { kind: 'transfer', provider: 'GetTransfer', hash: 'prenota' },
};

function blockTitle(content: Record<string, unknown>, type: string): string {
  if (typeof content.title === 'string' && content.title) return content.title;
  return BLOCK_META[type as keyof typeof BLOCK_META]?.label ?? type;
}

function blockPrice(content: Record<string, unknown>): number | null {
  if (typeof content.price === 'number') return content.price;
  const altId = content.selectedAlternativeId;
  const alts = content.alternatives as { id: string; price?: number }[] | undefined;
  if (altId && Array.isArray(alts)) {
    const alt = alts.find((a) => a.id === altId);
    if (alt?.price != null) return alt.price;
  }
  return null;
}

/**
 * LEGAL REVIEW REQUIRED — punto di aggregazione servizi.
 * Aggregare volo+hotel+attività attorno allo stesso viaggio/date può integrare
 * l'"agevolazione" di servizi turistici collegati (art. 33 c.1 lett. f e art. 40
 * D.Lgs. 62/2018). Mantenere: prezzi/fornitori/prenotazioni SEPARATI, nessun
 * prezzo forfettario, nessun checkout unico, nessuna trasmissione automatica dei
 * dati del viaggiatore da un servizio all'altro entro 24h (art. 33 c.1 lett. c
 * punto 2.4). Vedi lib/legal/compliance-copy.ts.
 */
export function servicesFromItinerary(
  tripId: string,
  days: ComposerDayRow[] | null | undefined
): TripCartItem[] {
  if (!days?.length) return [];
  const items: TripCartItem[] = [];

  for (const day of days) {
    for (const block of [...day.trip_blocks].sort((a, b) => a.sort_order - b.sort_order)) {
      const meta = BOOKABLE[block.block_type];
      if (!meta) continue;
      items.push({
        id: block.id,
        kind: meta.kind,
        title: blockTitle(block.content, block.block_type),
        subtitle: `Giorno ${day.day_index} · ${day.day_date}`,
        price: blockPrice(block.content),
        currency: 'EUR',
        checkoutHref: `/viaggi/${tripId}#${meta.hash}`,
        provider: meta.provider,
      });
    }
  }

  return items;
}

/** Servizi base sempre disponibili sul viaggio, anche senza itinerario composer. */
export function defaultTripServices(
  tripId: string,
  destination: string
): TripCartItem[] {
  const q = encodeURIComponent(destination);
  return [
    {
      id: `base-flight-${tripId}`,
      kind: 'flight',
      title: `Volo per ${destination}`,
      subtitle: 'Tariffe live',
      checkoutHref: `/prenota/voli?q=${q}&tripId=${tripId}`,
      provider: 'LiteAPI',
    },
    {
      id: `base-hotel-${tripId}`,
      kind: 'hotel',
      title: `Hotel a ${destination}`,
      subtitle: 'Tariffe live',
      checkoutHref: `/prenota/hotel?q=${q}&tripId=${tripId}`,
      provider: 'LiteAPI',
    },
    {
      id: `base-activity-${tripId}`,
      kind: 'activity',
      title: `Attività a ${destination}`,
      subtitle: 'Tour e ticket',
      checkoutHref: `/prenota/attivita?q=${q}&tripId=${tripId}`,
      provider: 'Viator',
    },
  ];
}
