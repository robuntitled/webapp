import { describe, expect, it } from 'vitest';
import { resolveUserTripRole } from '@/lib/trips/roles';

describe('resolveUserTripRole', () => {
  it('returns owner for trip creator', () => {
    expect(resolveUserTripRole('user-1', 'user-1', 'viewer')).toBe('owner');
  });

  it('returns participant role for non-creator', () => {
    expect(resolveUserTripRole('user-2', 'user-1', 'viewer')).toBe('viewer');
  });

  it('returns null for anonymous user', () => {
    expect(resolveUserTripRole(undefined, 'user-1', 'viewer')).toBeNull();
  });
});