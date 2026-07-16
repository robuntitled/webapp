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

function hotelIsComplete(block: { content: Record<string, unknown> }): boolean {
  const title = String(block.content.title ?? '').trim();
  const area = String(block.content.area ?? block.content.place ?? '').trim();
  const checkIn = String(block.content.checkInTime ?? '').trim();
  const checkOut = String(block.content.checkOutTime ?? '').trim();
  return Boolean(title && area && checkIn && checkOut);
}

export function validatePublishDraft(draft: ComposerDraft): PublishValidationIssue[] {
  const blocks = allBlocks(draft.days);
  const issues: PublishValidationIssue[] = [];

  const flights = blocks.filter((b) => b.type === 'flight');
  const hotels = blocks.filter((b) => b.type === 'hotel');

  if (flights.length > 0 && !flights.every(flightIsComplete)) {
    issues.push({
      code: 'flight-incomplete',
      message:
        'Completa i voli nel piano: punto di partenza, orario partenza e orario arrivo.',
    });
  }

  if (hotels.length > 0 && !hotels.every(hotelIsComplete)) {
    issues.push({
      code: 'hotel-incomplete',
      message:
        'Completa gli hotel nel piano: indirizzo/zona, orario check-in e check-out.',
    });
  }

  return issues;
}

export function canPublishDraft(draft: ComposerDraft): boolean {
  return validatePublishDraft(draft).length === 0;
}