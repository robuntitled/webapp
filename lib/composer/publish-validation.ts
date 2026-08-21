import { evaluateQualityGate } from '@/lib/composer/quality-gate';
import type { ComposerDay, ComposerDraft } from '@/types/composer';

export type PublishValidationIssue = {
  code: string;
  message: string;
};

function allBlocks(days: ComposerDay[]) {
  return days.flatMap((d) => d.blocks);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function flightIsComplete(block: { content: Record<string, unknown> }): boolean {
  const c = block.content;
  const title = text(c.title);
  const from = text(c.from) || text(c.origin) || text(c.originLabel) || text(c.pickupAddress);
  const departureTime = text(c.departureTime) || text(c.departureAt) || text(c.time);
  const arrivalTime = text(c.arrivalTime) || text(c.arrivalAt);
  const savedOffer = Boolean(text(c.offerId) && (text(c.origin) || from) && text(c.destination));
  return Boolean(title && from && ((departureTime && arrivalTime) || savedOffer));
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
  const templateTrip = Boolean(draft.templateId);
  const savedFlight = (draft.bookablePicks ?? []).some(
    (p) => p.kind === 'flight' && p.offerId
  );

  if (!templateTrip) {
    const flights = blocks.filter((b) => b.type === 'flight');
    const hotelCheckins = blocks.filter(
      (b) => b.type === 'hotel' && b.content.hotelPhase !== 'checkout'
    );

    if (flights.length > 0 && !flights.every(flightIsComplete) && !savedFlight) {
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
  }

  issues.push(
    ...evaluateQualityGate({
      title: draft.title,
      destination: draft.destination,
      startDate: draft.startDate,
      endDate: draft.endDate,
      days: draft.days,
      budgetOrientativo: draft.budgetHint ?? (templateTrip ? 900 : undefined),
      minParticipants: draft.minParticipants,
      maxParticipants: draft.maxParticipants,
      planningMode: draft.planningMode,
    })
  );

  return issues;
}

export function canPublishDraft(draft: ComposerDraft): boolean {
  return validatePublishDraft(draft).length === 0;
}
