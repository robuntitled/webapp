import { isTripEnded, isTripStarted } from '@/lib/utils/trip';

export type GuidedStepId = 'choose' | 'build' | 'invite' | 'book' | 'travel';

export type GuidedTripSummary = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  participantCount: number;
  isOwner: boolean;
};

export type GuidedJourneyInput = {
  hasDraft: boolean;
  draftDestination?: string | null;
  organizing: GuidedTripSummary[];
  joined: GuidedTripSummary[];
};

export type GuidedJourneyState = {
  currentStep: GuidedStepId;
  steps: Array<{ id: GuidedStepId; label: string; shortLabel: string }>;
  primaryTrip: GuidedTripSummary | null;
  draftDestination: string | null;
};

export const GUIDED_STEPS: GuidedJourneyState['steps'] = [
  { id: 'choose', label: 'Scegli come partire', shortLabel: 'Scegli' },
  { id: 'build', label: 'Crea il viaggio', shortLabel: 'Crea' },
  { id: 'invite', label: 'Invita gli amici', shortLabel: 'Invita' },
  { id: 'book', label: 'Prenota voli e hotel', shortLabel: 'Prenota' },
  { id: 'travel', label: 'Vivi il viaggio', shortLabel: 'Parti' },
];

function upcoming(trips: GuidedTripSummary[]) {
  return trips.filter((t) => !isTripEnded(t.endDate));
}

export function resolveGuidedJourney(input: GuidedJourneyInput): GuidedJourneyState {
  const organizing = upcoming(input.organizing);
  const joined = upcoming(input.joined);
  const draftDestination = input.draftDestination?.trim() || null;
  const hasDraft = input.hasDraft && Boolean(draftDestination);

  const primaryOwned = organizing[0] ?? null;
  const primaryJoined = joined[0] ?? null;

  let currentStep: GuidedStepId = 'choose';
  let primaryTrip: GuidedTripSummary | null = null;

  if (organizing.length === 0 && joined.length === 0) {
    currentStep = hasDraft ? 'build' : 'choose';
    primaryTrip = null;
  } else if (primaryOwned) {
    primaryTrip = primaryOwned;
    if (primaryOwned.participantCount <= 1) {
      currentStep = 'invite';
    } else if (isTripStarted(primaryOwned.startDate)) {
      currentStep = 'travel';
    } else {
      currentStep = 'book';
    }
  } else if (primaryJoined) {
    primaryTrip = primaryJoined;
    currentStep = isTripStarted(primaryJoined.startDate) ? 'travel' : 'book';
  }

  return {
    currentStep,
    steps: GUIDED_STEPS,
    primaryTrip,
    draftDestination,
  };
}

export function guidedStepIndex(step: GuidedStepId): number {
  return GUIDED_STEPS.findIndex((s) => s.id === step);
}
