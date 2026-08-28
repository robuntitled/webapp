export type HomeTravelMode = 'solo' | 'friends' | 'group';

export function parseHomeTravelMode(
  vista?: string | null,
  modalita?: string | null
): HomeTravelMode {
  if (vista === 'partenze') return 'group';
  if (modalita === 'amici') return 'friends';
  return 'solo';
}

export function homeTravelModeToPath(mode: HomeTravelMode): string {
  if (mode === 'group') return '/destinazioni?vista=partenze';
  if (mode === 'friends') return '/destinazioni?modalita=amici';
  return '/destinazioni';
}

export function homeTravelModeToTravelMode(
  mode: HomeTravelMode
): 'solo' | 'friends' | 'group' {
  if (mode === 'friends') return 'friends';
  if (mode === 'group') return 'group';
  return 'solo';
}
