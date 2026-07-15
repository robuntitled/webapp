/** Fasi wizard Composer v2 — landing leggero → compose → review */
export type ComposerWizardStep = 'landing' | 'plan' | 'review';

/** Step legacy salvati in bozze precedenti */
export type LegacyComposerWizardStep = 'intake' | 'setup';

export const WIZARD_STEPS: ComposerWizardStep[] = ['landing', 'plan', 'review'];

export function normalizeWizardStep(
  step: string | null | undefined
): ComposerWizardStep {
  if (step === 'plan' || step === 'review') return step;
  return 'landing';
}

export function wizardStepLabel(step: ComposerWizardStep): string {
  switch (step) {
    case 'landing':
      return 'Inizio';
    case 'plan':
      return 'Componi';
    case 'review':
      return 'Pubblica';
  }
}