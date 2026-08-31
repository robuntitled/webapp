export const WORKSPACE_TABS = ['itinerario', 'voli', 'hotel'] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

export function parseWorkspaceTab(value?: string | null): WorkspaceTab {
  if (value === 'voli' || value === 'flight' || value === 'flights') return 'voli';
  if (value === 'hotel' || value === 'hotels') return 'hotel';
  if (value === 'itinerario' || value === 'plan' || value === 'sights') return 'itinerario';
  return 'itinerario';
}

export function workspaceHref(basePath: string, tab: WorkspaceTab, stay?: string | null) {
  const params = new URLSearchParams();
  if (tab !== 'itinerario') params.set('tab', tab);
  if (stay) params.set('stay', stay);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
