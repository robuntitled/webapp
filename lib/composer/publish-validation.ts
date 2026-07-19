import type { ComposerDay, ComposerDraft } from '@/types/composer';

export type PublishValidationIssue = {
  code: 'flight-incomplete' | 'hotel-incomplete';
  message: string;
};

function allBlocks(days: ComposerDay[]) {
  return days.flatMap((d) => d.blocks);
}

function flightIsComplete(block: { content: Record<string, unknown> }): boolean {
  const title = String(block.content.title ?? '').trim();
  const from = String(block.content.from ?? block.content.pickupAddress ?? '').trim();
  const departureTime = String(block.content.departureTime ?? block.content.time ?? '').trim();
  const arrivalTime = String(block.content.arrivalTime ?? '').trim();
  return Boolean(title && from && departureTime && arrivalTime);
}

/**
 * Allineato al form "Aggiungi hotel":
 * - ricerca (nome + place/coords/placeId)
 * - check-in / check-out (default 14:00 e 11:00 se assenti)
 * - prezzo opzionale
 * I check-out automatici non bloccano la pubblicazione.
 */
function hotelIsComplete(block: { content: Record<string, unknown> }): boolean {
  if (block.content.hotelPhase === 'checkout') {
    return true;
  }

  const title = String(block.content.title ?? '').trim();
  if (!title) return false;

  // "Zona" nel messaggio = place/area dalla ricerca hotel (non un campo separato in UI)
  const hasWhere = Boolean(
    String(block.content.place ?? '').trim() ||
      String(block.content.area ?? '').trim() ||
      String(block.content.placeId ?? '').trim() ||
      (typeof block.content.lat === 'number' &&
        typeof block.content.lng === 'number' &&
        Number.isFinite(block.content.lat) &&
        Number.isFinite(block.content.lng))
  );

  // Stessi default del form Aggiungi hotel
  const checkIn = String(
    block.content.checkInTime ?? block.content.time ?? '14:00'
  ).trim();
  const checkOut = String(block.content.checkOutTime ?? '11:00').trim();

  return Boolean(hasWhere && checkIn && checkOut);
}

export function validatePublishDraft(draft: ComposerDraft): PublishValidationIssue[] {
  const blocks = allBlocks(draft.days);
  const issues: PublishValidationIssue[] = [];

  const flights = blocks.filter((b) => b.type === 'flight');
  const hotelCheckins = blocks.filter(
    (b) => b.type === 'hotel' && b.content.hotelPhase !== 'checkout'
  );

  if (flights.length > 0 && !flights.every(flightIsComplete)) {
    issues.push({
      code: 'flight-incomplete',
      message:
        'Completa i voli nel piano: punto di partenza, orario partenza e orario arrivo.',
    });
  }

  if (hotelCheckins.length > 0 && !hotelCheckins.every(hotelIsComplete)) {
    issues.push({
      code: 'hotel-incomplete',
      message:
        'Completa gli hotel: scegli l’hotel dalla ricerca (nome e luogo), con check-in e check-out (es. 14:00 e 11:00).',
    });
  }

  return issues;
}

export function canPublishDraft(draft: ComposerDraft): boolean {
  return validatePublishDraft(draft).length === 0;
}
