/** Ultima attività Viator aperta — prefill recap sulla pratica. */

const KEY = 'nomadlink.activity.last';

export type ActivityDraft = {
  title: string;
  provider: 'viator' | 'attractions';
  bookingUrl?: string | null;
  amountEur?: number | null;
  currency?: string | null;
  savedAt: number;
};

export function saveLastActivityDraft(draft: Omit<ActivityDraft, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // ignore
  }
}

export function loadLastActivityDraft(): ActivityDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActivityDraft;
    if (!parsed?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastActivityDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(KEY);
}
