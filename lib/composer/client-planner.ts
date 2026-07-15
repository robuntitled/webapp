import type { PlannerProfile } from '@/types/planner';
import type { ComposerDraft } from '@/types/composer';
import type { ComposerWizardStep } from '@/lib/composer/wizard-steps';

export type { ComposerWizardStep } from '@/lib/composer/wizard-steps';

export async function savePlannerProfile(profile: PlannerProfile): Promise<void> {
  const response = await fetch('/api/planner/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Salvataggio profilo fallito');
  }
}

export async function saveComposerDraft(payload: {
  draft: Partial<ComposerDraft>;
  currentStep: ComposerWizardStep;
  plannerProfile?: PlannerProfile | null;
}): Promise<void> {
  const response = await fetch('/api/composer/draft', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Salvataggio bozza fallito');
  }
}

export async function clearComposerDraft(): Promise<void> {
  await fetch('/api/composer/draft', { method: 'DELETE' });
}