import { createEmptyBlock } from '@/lib/composer/blocks';
import { syncHotelCheckoutBlocks } from '@/lib/composer/hotel-checkout-sync';
import type {
  ComposerBlock,
  ComposerBookablePick,
  ComposerDay,
  ComposerDraft,
} from '@/types/composer';

export type ItineraryDayLike = {
  day_index: number;
  day_date: string;
  trip_blocks: {
    id: string;
    sort_order: number;
    block_type: string;
    content: Record<string, unknown>;
  }[];
};

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function bool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

export function pickKey(pick: ComposerBookablePick): string {
  if (pick.offerId) return `offer:${pick.offerId}`;
  if (pick.hotelId) return `hotel:${pick.hotelId}`;
  if (pick.productCode) return `viator:${pick.productCode}`;
  if (pick.placeId) return `place:${pick.placeId}`;
  return `id:${pick.id}`;
}

export function mergeBookablePicks(
  current: ComposerBookablePick[] | undefined,
  incoming: ComposerBookablePick[] | undefined
): ComposerBookablePick[] {
  const out: ComposerBookablePick[] = [];
  const seen = new Set<string>();
  for (const pick of [...(incoming ?? []), ...(current ?? [])]) {
    const key = pickKey(pick);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pick);
  }
  return out;
}

function blockMatchesPick(block: ComposerBlock, pick: ComposerBookablePick): boolean {
  const c = block.content;
  if (pick.offerId && str(c.offerId) === pick.offerId) return true;
  if (pick.hotelId && str(c.hotelId) === pick.hotelId) return true;
  if (pick.productCode && str(c.productCode) === pick.productCode) return true;
  if (pick.placeId && str(c.placeId) === pick.placeId) return true;
  return false;
}

function alreadyInDays(days: ComposerDay[], pick: ComposerBookablePick): boolean {
  return days.some((day) => day.blocks.some((b) => blockMatchesPick(b, pick)));
}

function contentFromPick(pick: ComposerBookablePick): Record<string, unknown> {
  return {
    title: pick.title,
    provider: pick.provider,
    bookable: pick.provider === 'liteapi' || pick.provider === 'viator',
    source: pick.provider,
    lat: pick.lat ?? undefined,
    lng: pick.lng ?? undefined,
    photoUrl: pick.photoUrl ?? undefined,
    price: pick.price ?? null,
    currency: pick.currency ?? 'EUR',
    placeId: pick.placeId ?? undefined,
    hotelId: pick.hotelId ?? undefined,
    offerId: pick.offerId ?? undefined,
    rateId: pick.rateId ?? undefined,
    place: pick.address ?? pick.city ?? undefined,
    area: pick.city ?? undefined,
    stars: pick.stars ?? undefined,
    rating: pick.rating ?? undefined,
    roomName: pick.roomName ?? undefined,
    boardName: pick.boardName ?? undefined,
    refundable: pick.freeCancellation,
    nights: pick.checkIn && pick.checkOut ? undefined : pick.kind === 'hotel' ? 1 : undefined,
    origin: pick.origin ?? undefined,
    destination: pick.destinationIata ?? undefined,
    airline: pick.airline ?? undefined,
    airlineCode: pick.airlineCode ?? undefined,
    airlineLogo: pick.airlineLogo ?? undefined,
    departureTime: pick.departureAt ?? undefined,
    arrivalTime: pick.arrivalAt ?? undefined,
    flightNumber: pick.flightNumber ?? undefined,
    stops: pick.stops ?? undefined,
    cabinClass: pick.cabinClass ?? undefined,
    roundTrip: pick.hasReturn,
    returnOrigin: pick.returnOrigin ?? undefined,
    returnDestination: pick.returnDestination ?? undefined,
    returnAirline: pick.returnAirline ?? undefined,
    returnDepartureAt: pick.returnDepartureAt ?? undefined,
    returnArrivalAt: pick.returnArrivalAt ?? undefined,
    productCode: pick.productCode ?? undefined,
    bookingUrl: pick.bookingUrl ?? undefined,
    checkInDate: pick.checkIn ?? undefined,
    checkOutDate: pick.checkOut ?? undefined,
  };
}

function upsertFlight(days: ComposerDay[], pick: ComposerBookablePick): ComposerDay[] {
  const first = days[0];
  if (!first) return days;
  const existing = first.blocks.find((b) => b.type === 'flight' && b.content.returnLeg !== true);
  if (existing) {
    return days.map((day, i) =>
      i !== 0
        ? day
        : {
            ...day,
            blocks: day.blocks.map((b) =>
              b.id === existing.id
                ? { ...b, content: { ...b.content, ...contentFromPick(pick) } }
                : b
            ),
          }
    );
  }
  const block = createEmptyBlock('flight', first.blocks.length, contentFromPick(pick));
  return days.map((day, i) => (i !== 0 ? day : { ...day, blocks: [block, ...day.blocks] }));
}

function upsertHotel(days: ComposerDay[], pick: ComposerBookablePick): ComposerDay[] {
  const first = days[0];
  if (!first) return days;
  const existing = first.blocks.find(
    (b) => b.type === 'hotel' && b.content.hotelPhase !== 'checkout'
  );
  const extra = contentFromPick(pick);
  extra.hotelPhase = 'checkin';
  extra.checkInTime = '14:00';
  extra.checkOutTime = '11:00';
  extra.nights = Math.max(1, days.length - 1);
  if (existing) {
    const merged: ComposerBlock = {
      ...existing,
      content: { ...existing.content, ...extra },
    };
    return syncHotelCheckoutBlocks(days, first.dayIndex, merged).days;
  }
  const block = createEmptyBlock('hotel', first.blocks.length, extra);
  const withBlock = days.map((day, i) =>
    i !== 0 ? day : { ...day, blocks: [...day.blocks, block] }
  );
  return syncHotelCheckoutBlocks(withBlock, first.dayIndex, block).days;
}

function appendPoi(days: ComposerDay[], pick: ComposerBookablePick): ComposerDay[] {
  const type = pick.kind === 'activity' ? 'activity' : 'attraction';
  const target =
    days.find((d) => d.dayIndex === (pick.dayIndex ?? (days.length > 1 ? 2 : 1))) ?? days[0];
  if (!target) return days;
  const block = createEmptyBlock(type, target.blocks.length, contentFromPick(pick));
  return days.map((day) =>
    day.dayIndex !== target.dayIndex ? day : { ...day, blocks: [...day.blocks, block] }
  );
}

export function applyPicksToDays(
  days: ComposerDay[],
  picks: ComposerBookablePick[]
): ComposerDay[] {
  if (!days.length || !picks.length) return days;
  let next = days;
  for (const pick of picks) {
    if (alreadyInDays(next, pick)) continue;
    if (pick.kind === 'flight') next = upsertFlight(next, pick);
    else if (pick.kind === 'hotel') next = upsertHotel(next, pick);
    else next = appendPoi(next, pick);
  }
  return next;
}

function pickFromBlock(
  block: ComposerBlock,
  dayIndex: number,
  dayDate?: string
): ComposerBookablePick | null {
  const c = block.content;
  const providerRaw = str(c.provider) ?? str(c.source);
  const provider: ComposerBookablePick['provider'] =
    providerRaw === 'viator' || str(c.productCode) || str(c.bookingUrl)?.includes('viator')
      ? 'viator'
      : providerRaw === 'liteapi' || str(c.hotelId) || (block.type === 'flight' && str(c.offerId))
        ? 'liteapi'
        : 'google';

  if (block.type === 'flight') {
    if (!str(c.offerId) && !str(c.origin)) return null;
    return {
      id: block.id,
      kind: 'flight',
      provider: str(c.offerId) ? 'liteapi' : provider,
      title: str(c.title) ?? `Volo ${str(c.origin) ?? ''} → ${str(c.destination) ?? ''}`.trim(),
      price: num(c.price),
      currency: str(c.currency) ?? 'EUR',
      dayIndex,
      blockId: block.id,
      offerId: str(c.offerId),
      origin: str(c.origin),
      destinationIata: str(c.destination),
      airline: str(c.airline),
      airlineCode: str(c.airlineCode),
      airlineLogo: str(c.airlineLogo),
      departureAt: str(c.departureTime) ?? str(c.departureAt),
      arrivalAt: str(c.arrivalTime) ?? str(c.arrivalAt),
      durationMinutes: num(c.durationMinutes),
      stops: num(c.stops),
      flightNumber: str(c.flightNumber),
      cabinClass: str(c.cabinClass),
      hasReturn: bool(c.roundTrip) || bool(c.hasReturn),
      returnOrigin: str(c.returnOrigin),
      returnDestination: str(c.returnDestination),
      returnAirline: str(c.returnAirline),
      returnAirlineCode: str(c.returnAirlineCode),
      returnAirlineLogo: str(c.returnAirlineLogo),
      returnDepartureAt: str(c.returnDepartureAt),
      returnArrivalAt: str(c.returnArrivalAt),
      returnDurationMinutes: num(c.returnDurationMinutes),
      returnStops: num(c.returnStops),
      returnFlightNumber: str(c.returnFlightNumber),
    };
  }

  if (block.type === 'hotel' && c.hotelPhase === 'checkout') return null;

  if (block.type === 'hotel') {
    if (!str(c.hotelId) && !str(c.placeId) && num(c.lat) == null) return null;
    return {
      id: block.id,
      kind: 'hotel',
      provider: str(c.hotelId) ? 'liteapi' : 'google',
      title: str(c.title) ?? 'Hotel',
      lat: num(c.lat),
      lng: num(c.lng),
      photoUrl: str(c.photoUrl),
      price: num(c.price),
      currency: str(c.currency) ?? 'EUR',
      dayIndex,
      blockId: block.id,
      placeId: str(c.placeId),
      hotelId: str(c.hotelId),
      offerId: str(c.offerId),
      rateId: str(c.rateId),
      address: str(c.place),
      city: str(c.area),
      stars: num(c.stars),
      rating: num(c.rating),
      roomName: str(c.roomName),
      boardName: str(c.boardName),
      freeCancellation: bool(c.refundable) || bool(c.freeCancellation),
      checkIn: str(c.checkInDate) ?? dayDate,
      checkOut: str(c.checkOutDate),
    };
  }

  if (block.type === 'activity' || block.type === 'attraction') {
    if (num(c.lat) == null && !str(c.productCode) && !str(c.placeId)) return null;
    return {
      id: block.id,
      kind: block.type,
      provider:
        str(c.productCode) || str(c.bookingUrl)?.includes('viator') ? 'viator' : 'google',
      title: str(c.title) ?? (block.type === 'activity' ? 'Attività' : 'Must visit'),
      lat: num(c.lat),
      lng: num(c.lng),
      photoUrl: str(c.photoUrl),
      price: num(c.price) ?? num(c.priceFrom),
      currency: str(c.currency) ?? 'EUR',
      dayIndex,
      blockId: block.id,
      placeId: str(c.placeId),
      productCode: str(c.productCode),
      bookingUrl: str(c.bookingUrl),
      rating: num(c.rating),
    };
  }

  return null;
}

export function picksFromDraft(draft: Pick<ComposerDraft, 'days' | 'bookablePicks'>): ComposerBookablePick[] {
  const fromDays: ComposerBookablePick[] = [];
  for (const day of draft.days) {
    for (const block of day.blocks) {
      const pick = pickFromBlock(block, day.dayIndex, day.date);
      if (pick) fromDays.push(pick);
    }
  }
  return mergeBookablePicks(fromDays, draft.bookablePicks);
}

export function picksFromItinerary(days: ItineraryDayLike[]): ComposerBookablePick[] {
  const out: ComposerBookablePick[] = [];
  for (const day of days) {
    for (const row of day.trip_blocks) {
      const block: ComposerBlock = {
        id: row.id,
        type: row.block_type as ComposerBlock['type'],
        sortOrder: row.sort_order,
        content: row.content,
        alternatives: [],
        selectedAlternativeId: null,
      };
      const pick = pickFromBlock(block, day.day_index, day.day_date);
      if (pick) out.push(pick);
    }
  }
  return out;
}

export function isCheckoutBookable(pick: ComposerBookablePick): boolean {
  if (pick.provider === 'viator') return Boolean(pick.bookingUrl || pick.productCode);
  if (pick.provider === 'liteapi') {
    if (pick.kind === 'flight') return Boolean(pick.offerId);
    if (pick.kind === 'hotel') return Boolean(pick.hotelId);
  }
  return false;
}
