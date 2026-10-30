export type HomeTravelMode = 'solo' | 'friends' | 'group';

export type HomeEntryPath = 'destinazioni' | 'unisciti' | 'organizza' | 'gruppi';

export function parseHomeEntryPath(
  vista?: string | null,
  modalita?: string | null
): HomeEntryPath {
  if (vista === 'partenze' || vista === 'unisciti' || vista === 'gruppi' || modalita === 'amici') {
    return 'gruppi';
  }
  return 'organizza';
}

export function homeEntryPathToHref(path: HomeEntryPath): string {
  if (path === 'unisciti' || path === 'gruppi') return '/gruppi';
  return '/organizza';
}

/** Compat: vecchi query param → path di ingresso. */
export function parseHomeTravelMode(
  vista?: string | null,
  modalita?: string | null
): HomeTravelMode {
  if (vista === 'partenze' || vista === 'unisciti' || vista === 'gruppi') return 'group';
  if (modalita === 'amici') return 'friends';
  return 'solo';
}

export function homeTravelModeToPath(mode: HomeTravelMode): string {
  if (mode === 'group') return '/gruppi';
  return '/organizza';
}

export function homeTravelModeToTravelMode(
  mode: HomeTravelMode
): 'solo' | 'friends' | 'group' {
  if (mode === 'friends') return 'friends';
  if (mode === 'group') return 'group';
  return 'solo';
}
