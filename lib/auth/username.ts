import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

/** 3–24 char: lettere minuscole, numeri, underscore */
export const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24);
}

export function slugFromPerson(options: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const fromName = normalizeUsername(
    [options.firstName, options.lastName].filter(Boolean).join('_')
  );
  if (fromName.length >= 3) return fromName;

  const local = options.email?.split('@')[0] ?? '';
  const fromEmail = normalizeUsername(local);
  if (fromEmail.length >= 3) return fromEmail;

  return 'nomad';
}

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

/**
 * Alloca uno username univoco partendo da un seed.
 * Es. marco_rossi → marco_rossi2 → marco_rossi_a3f
 */
export async function allocateUniqueUsername(
  seed: string,
  excludeUserId?: string
): Promise<string> {
  let base = normalizeUsername(seed);
  if (base.length < 3) base = 'nomad';
  if (base.length > 20) base = base.slice(0, 20);

  // Tentativi deterministici + random
  for (let i = 0; i < 40; i++) {
    let candidate: string;
    if (i === 0) candidate = base;
    else if (i < 15) {
      const n = i + 1;
      const suffix = String(n);
      candidate = `${base.slice(0, 24 - suffix.length)}${suffix}`;
    } else {
      const rnd = Math.random().toString(36).slice(2, 6);
      candidate = `${base.slice(0, 24 - rnd.length - 1)}_${rnd}`;
    }

    candidate = normalizeUsername(candidate);
    if (!isValidUsername(candidate)) continue;

    let q = supabaseAdmin.from('users').select('id').eq('username', candidate);
    if (excludeUserId) q = q.neq('id', excludeUserId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }

  // Fallback estremo
  const fallback = `user_${Date.now().toString(36).slice(-8)}`;
  return fallback.slice(0, 24);
}

export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!isValidUsername(normalized)) return false;

  let q = supabaseAdmin.from('users').select('id').eq('username', normalized);
  if (excludeUserId) q = q.neq('id', excludeUserId);
  const { data } = await q.maybeSingle();
  return !data;
}
