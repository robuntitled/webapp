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
 * Solo i check-in contano per la pubblicazione.
 * I blocchi "check-out" automatici non devono bloccare (sono collegati al check-in).
 */
function hotelIsComplete(block: { content: Record<string, unknown> }): boolean {
  // Check-out automatico: ok se ha almeno titolo e orario check-out
  if (block.content.hotelPhase === 'checkout') {
    return true;
  }

  const title = String(block.content.title ?? '').trim();
  const area = String(block.content.area ?? block.content.place ?? '').trim();
  const checkIn = String(
    block.content.checkInTime ?? block.content.time ?? ''
  ).trim();
  const checkOut = String(block.content.checkOutTime ?? '').trim();
  // Zona/indirizzo: place da Google o area; orari con default tipici se assenti in UI
  return Boolean(title && area && checkIn && checkOut);
}

export function validatePublishDraft(draft: ComposerDraft): PublishValidationIssue[] {
  const blocks = allBlocks(draft.days);
  const issues: PublishValidationIssue[] = [];

  const flights = blocks.filter((b) => b.type === 'flight');
  // Solo check-in hotel (non i tab check-out automatici)
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
        'Completa gli hotel nel piano: scegli l’hotel (nome e zona/indirizzo) e imposta check-in (es. 14:00) e check-out (es. 11:00).',
    });
  }

  return issues;
}

export function canPublishDraft(draft: ComposerDraft): boolean {
  return validatePublishDraft(draft).length === 0;
}