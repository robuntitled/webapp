import type { TravelIntent } from '@/lib/onboarding/keywords';

export const ONBOARDING_STEPS = ['model', 'home', 'intent'] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export type OnboardingHome = {
  city: string;
  country?: string | null;
  lat: number;
  lng: number;
  placeId?: string | null;
};

export type OnboardingDraft = {
  intent: TravelIntent | null;
  keywordIds: string[];
  home: OnboardingHome | null;
};

export const EMPTY_ONBOARDING_DRAFT: OnboardingDraft = {
  intent: null,
  keywordIds: [],
  home: null,
};

export function nextOnboardingStep(step: OnboardingStepId): OnboardingStepId | null {
  const i = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[i + 1] ?? null;
}

export function prevOnboardingStep(step: OnboardingStepId): OnboardingStepId | null {
  const i = ONBOARDING_STEPS.indexOf(step);
  return i > 0 ? (ONBOARDING_STEPS[i - 1] ?? null) : null;
}

export function onboardingStepIndex(step: OnboardingStepId): number {
  return ONBOARDING_STEPS.indexOf(step) + 1;
}

/** Dopo onboarding: ramifica. Login successivi: itinerari. */
export function afterOnboardingPath(intent: TravelIntent): string {
  return intent === 'book' ? '/destinazioni?mode=group' : '/destinazioni';
}

export function postLoginPath(opts: {
  onboardingCompleted: boolean;
  travelIntent?: TravelIntent | null;
}): string {
  if (!opts.onboardingCompleted) return '/onboarding';
  return '/destinazioni';
}
