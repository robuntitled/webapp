/**
 * Cache form di ricerca Prenota (sessionStorage).
 * Sopravvive al cambio pagina nello stesso tab; si azzera alla chiusura tab.
 */

const PREFIX = 'nomadlink.search.';

export type SearchCacheKey =
  | 'flights'
  | 'hotels'
  | 'attractions'
  | 'activities'
  | 'transfer'
  | 'trip-flights'
  | 'trip-hotels';

export function loadSearchFormCache<T>(key: SearchCacheKey): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveSearchFormCache<T>(key: SearchCacheKey, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota / private mode
  }
}

export function clearSearchFormCache(key: SearchCacheKey): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PREFIX + key);
}
