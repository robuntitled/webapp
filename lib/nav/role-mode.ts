'use client';

import {
  ROLE_MODE_STORAGE_KEY,
  type RoleMode,
} from '@/lib/nav/routes';

export function readRoleMode(): RoleMode {
  if (typeof window === 'undefined') return 'join';
  try {
    const raw = window.localStorage.getItem(ROLE_MODE_STORAGE_KEY);
    if (raw === 'organize' || raw === 'join') return raw;
  } catch {
    /* ignore */
  }
  return 'join';
}

export function writeRoleMode(mode: RoleMode): void {
  try {
    window.localStorage.setItem(ROLE_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
