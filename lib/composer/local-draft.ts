import { normalizeWizardStep, type ComposerWizardStep } from '@/lib/composer/wizard-steps';
import type { ComposerDraft } from '@/types/composer';

export const COMPOSER_LOCAL_DRAFT_KEY = 'nomadlink-composer-draft';

type StoredComposerSession = {
  v: 2;
  draft: ComposerDraft;
  step: ComposerWizardStep;
  updatedAt: number;
};

export function writeComposerLocalSession(
  draft: ComposerDraft,
  step: ComposerWizardStep
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredComposerSession = {
      v: 2,
      draft,
      step,
      updatedAt: Date.now(),
    };
    localStorage.setItem(COMPOSER_LOCAL_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearComposerLocalSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(COMPOSER_LOCAL_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Legge bozza + step da localStorage (formato v2 o legacy solo-draft).
 */
export function readComposerLocalSession(): {
  draft: ComposerDraft;
  step: ComposerWizardStep;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COMPOSER_LOCAL_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredComposerSession | ComposerDraft;

    // Formato v2: { v, draft, step }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'v' in parsed &&
      (parsed as StoredComposerSession).v === 2 &&
      (parsed as StoredComposerSession).draft
    ) {
      const session = parsed as StoredComposerSession;
      if (!session.draft.destination?.trim()) return null;
      return {
        draft: session.draft,
        step: normalizeWizardStep(session.step),
      };
    }

    // Legacy: l'intero oggetto era il draft
    const legacy = parsed as ComposerDraft;
    if (!legacy?.destination?.trim()) return null;
    return {
      draft: legacy,
      step: 'landing',
    };
  } catch {
    return null;
  }
}
