export type HomeTravelMode = 'solo' | 'friends' | 'group';

export type HomeEntryPath = 'destinazioni' | 'unisciti';

export function parseHomeEntryPath(
  vista?: string | null,
  modalita?: string | null
): HomeEntryPath {
  if (vista === 'partenze' || vista === 'unisciti' || modalita === 'amici') {
    return 'unisciti';
  }
  return 'destinazioni';
}

export function homeEntryPathToHref(path: HomeEntryPath): string {
  return path === 'unisciti' ? '/partenze' : '/destinazioni';
}

/** Compat: vecchi query param → path di ingresso. */
export function parseHomeTravelMode(
  vista?: string | null,
  modalita?: string | null
): HomeTravelMode {
  if (vista === 'partenze' || vista === 'unisciti') return 'group';
  if (modalita === 'amici') return 'friends';
  return 'solo';
}

export function homeTravelModeToPath(mode: HomeTravelMode): string {
  if (mode === 'group') return '/partenze';
  if (mode === 'friends') return '/destinazioni';
  return '/destinazioni';
}

export function homeTravelModeToTravelMode(
  mode: HomeTravelMode
): 'solo' | 'friends' | 'group' {
  if (mode === 'friends') return 'friends';
  if (mode === 'group') return 'group';
  return 'solo';
}
