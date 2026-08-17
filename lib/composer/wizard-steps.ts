/** Fasi wizard: template → config → editor → pubblica in formazione */
export type ComposerWizardStep = 'source' | 'landing' | 'plan' | 'review';

/** Step legacy salvati in bozze precedenti */
export type LegacyComposerWizardStep = 'intake' | 'setup';

export const WIZARD_STEPS: ComposerWizardStep[] = ['source', 'landing', 'plan', 'review'];

export function normalizeWizardStep(
  step: string | null | undefined
): ComposerWizardStep {
  if (step === 'source' || step === 'plan' || step === 'review' || step === 'landing') {
    return step;
  }
  return 'source';
}

export function wizardStepLabel(step: ComposerWizardStep): string {
  switch (step) {
    case 'source':
      return 'Template';
    case 'landing':
      return 'Config';
    case 'plan':
      return 'Editor';
    case 'review':
      return 'Pubblica';
  }
}