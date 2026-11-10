import { describe, expect, it } from 'vitest';
import { parseWorkspaceTab, WORKSPACE_TABS } from '@/lib/itineraries/workspace-tab';

describe('workspace-tab', () => {
  it('includes partecipanti and maps aliases', () => {
    expect(WORKSPACE_TABS).toContain('partecipanti');
    expect(parseWorkspaceTab('voli')).toBe('voli');
    expect(parseWorkspaceTab('participants')).toBe('partecipanti');
    expect(parseWorkspaceTab('members')).toBe('partecipanti');
  });
});
