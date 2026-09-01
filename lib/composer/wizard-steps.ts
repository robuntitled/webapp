/** Fasi wizard legacy salvate in bozze `composer_drafts` (GDPR). */
export type ComposerWizardStep = 'source' | 'landing' | 'plan' | 'review';

export function normalizeWizardStep(
  step: string | null | undefined
): ComposerWizardStep {
  if (step === 'plan') return 'review';
  if (step === 'source' || step === 'review' || step === 'landing') {
    return step;
  }
  return 'source';
}
