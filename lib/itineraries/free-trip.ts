/** Sentinel e helper per viaggi senza itinerario template (Fase 1 / M2). */

export const FREE_TRIP_TEMPLATE_ID = 'viaggio-libero' as const;

export type PlannedLeg = {
  origin: string;
  destination: string;
  date: string;
  kind?: 'outbound' | 'return' | 'internal' | 'other';
};

export function isFreeTripTemplateId(
  templateId: string | null | undefined
): boolean {
  if (templateId == null || templateId === '') return true;
  return templateId === FREE_TRIP_TEMPLATE_ID;
}

export function practiceDestinationLabel(input: {
  templateName?: string | null;
  destinationLabel?: string | null;
  destinationIata?: string | null;
  templateId?: string | null;
}): string {
  if (input.templateName?.trim()) return input.templateName.trim();
  if (input.destinationLabel?.trim()) return input.destinationLabel.trim();
  if (input.destinationIata?.trim()) return input.destinationIata.trim().toUpperCase();
  if (isFreeTripTemplateId(input.templateId)) return 'Viaggio libero';
  return input.templateId?.trim() || 'Il tuo viaggio';
}
