import { describe, expect, it } from 'vitest';
import { resolveGuidedJourney } from '@/lib/dashboard/guided-journey';

const future = {
  startDate: '2099-06-01',
  endDate: '2099-06-10',
};

describe('resolveGuidedJourney', () => {
  it('starts at choose when empty', () => {
    const s = resolveGuidedJourney({
      hasDraft: false,
      organizing: [],
      joined: [],
    });
    expect(s.currentStep).toBe('choose');
  });

  it('moves to build when draft exists', () => {
    const s = resolveGuidedJourney({
      hasDraft: true,
      draftDestination: 'Lisbona',
      organizing: [],
      joined: [],
    });
    expect(s.currentStep).toBe('build');
    expect(s.draftDestination).toBe('Lisbona');
  });

  it('asks to invite when owner is alone', () => {
    const s = resolveGuidedJourney({
      hasDraft: false,
      organizing: [
        {
          id: 't1',
          title: 'Lisbona',
          destination: 'Lisbona',
          participantCount: 1,
          isOwner: true,
          ...future,
        },
      ],
      joined: [],
    });
    expect(s.currentStep).toBe('invite');
    expect(s.primaryTrip?.id).toBe('t1');
  });

  it('asks to book when crew is ready', () => {
    const s = resolveGuidedJourney({
      hasDraft: false,
      organizing: [
        {
          id: 't1',
          title: 'Lisbona',
          destination: 'Lisbona',
          participantCount: 3,
          isOwner: true,
          ...future,
        },
      ],
      joined: [],
    });
    expect(s.currentStep).toBe('book');
  });

  it('joined-only users skip invite', () => {
    const s = resolveGuidedJourney({
      hasDraft: false,
      organizing: [],
      joined: [
        {
          id: 't2',
          title: 'Berlino',
          destination: 'Berlino',
          participantCount: 4,
          isOwner: false,
          ...future,
        },
      ],
    });
    expect(s.currentStep).toBe('book');
  });
});
