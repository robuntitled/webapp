import { wizardStepLabel, type ComposerWizardStep } from '@/lib/composer/wizard-steps';
import type { ComposerDraft } from '@/types/composer';

export function isMeaningfulComposerDraft(draft: Partial<ComposerDraft> | null | undefined): boolean {
  if (!draft) return false;
  return Boolean(draft.destination?.trim());
}

export function summarizeComposerDraft(draft: Partial<ComposerDraft>): {
  destinationLabel: string;
  dateRange: string | null;
  dayCount: number;
  blockCount: number;
  stepLabel: string;
} {
  const destinationLabel =
    draft.destinationMeta?.label ?? draft.destination?.trim() ?? 'Bozza senza titolo';

  let dateRange: string | null = null;
  if (draft.startDate && draft.endDate) {
    const start = new Date(draft.startDate);
    const end = new Date(draft.endDate);
    const fmt = (d: Date) =>
      d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    dateRange = `${fmt(start)} → ${fmt(end)}`;
  }

  const days = draft.days ?? [];
  const blockCount = days.reduce((n, d) => n + (d.blocks?.length ?? 0), 0);

  return {
    destinationLabel,
    dateRange,
    dayCount: days.length,
    blockCount,
    stepLabel: wizardStepLabel('landing'),
  };
}

export function summarizeComposerDraftWithStep(
  draft: Partial<ComposerDraft>,
  step: ComposerWizardStep
): ReturnType<typeof summarizeComposerDraft> {
  return {
    ...summarizeComposerDraft(draft),
    stepLabel: wizardStepLabel(step),
  };
}