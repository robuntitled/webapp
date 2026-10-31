import { describe, expect, it } from 'vitest';
import {
  canReusePrivateEditionForUser,
  privateCreatesMustYieldDistinctEditions,
} from '@/lib/itineraries/private-edition';

describe('private edition privacy', () => {
  const nicola = '056481fe-9edf-40b4-8148-891df21cd0d3';
  const roberto = 'e72fa80b-c92b-4430-9bd9-b96a06a82c89';
  const nicolaEdition = {
    id: '4792506a-bae7-42e5-8cdd-5989b74e1791',
    edition_type: 'private',
    created_by: nicola,
  };

  it('refuses reuse of another user private edition (QA case)', () => {
    expect(canReusePrivateEditionForUser(nicolaEdition, roberto)).toBe(false);
    expect(canReusePrivateEditionForUser(nicolaEdition, nicola)).toBe(true);
  });

  it('refuses reuse of official editions on private create', () => {
    expect(
      canReusePrivateEditionForUser(
        { edition_type: 'official', created_by: null },
        roberto
      )
    ).toBe(false);
  });

  it('refuses reuse when created_by is missing', () => {
    expect(
      canReusePrivateEditionForUser(
        { edition_type: 'private', created_by: null },
        roberto
      )
    ).toBe(false);
  });

  it('two users creating private trips same dest/dates get distinct editions', () => {
    // B ha una bozza agganciata per errore all’edition di A → non deve riusarla
    const outcome = privateCreatesMustYieldDistinctEditions({
      userA: nicola,
      userB: roberto,
      draftEditionForA: nicolaEdition,
      draftEditionForB: nicolaEdition,
    });
    expect(outcome.reuseA).toBe(true);
    expect(outcome.reuseB).toBe(false);
    expect(outcome.mustCreateNewForB).toBe(true);

    // Entrambi senza bozza → entrambi creano nuova
    const fresh = privateCreatesMustYieldDistinctEditions({
      userA: nicola,
      userB: roberto,
    });
    expect(fresh.mustCreateNewForA).toBe(true);
    expect(fresh.mustCreateNewForB).toBe(true);
  });
});
