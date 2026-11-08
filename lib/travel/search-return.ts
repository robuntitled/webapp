/**
 * Helper per tornare dalla checkout alla ricerca preservando il contesto.
 * I campi form restano in sessionStorage (`search-form-cache`);
 * la query `reason` guida copy/UX (offerta scaduta, refresh).
 */

export type SearchReturnTab = 'voli' | 'hotel';

export type SearchReturnReason = 'offer_unavailable' | 'price_changed' | 'manual';

export function getSearchReturnHref(
  tab: SearchReturnTab,
  options?: { practiceId?: string; reason?: SearchReturnReason }
): string {
  if (options?.practiceId) {
    return `/pratica/${options.practiceId}?tab=${tab}`;
  }
  const base = tab === 'hotel' ? '/prenota/hotel' : '/prenota/voli';
  if (!options?.reason || options.reason === 'manual') return base;
  const params = new URLSearchParams({ reason: options.reason });
  return `${base}?${params.toString()}`;
}

export function parseSearchReturnReason(
  value: string | null | undefined
): SearchReturnReason | null {
  if (value === 'offer_unavailable' || value === 'price_changed' || value === 'manual') {
    return value;
  }
  return null;
}

export function searchReturnBannerCopy(reason: SearchReturnReason | null): string | null {
  if (reason === 'offer_unavailable') {
    return 'Quell’offerta non è più disponibile. I tuoi filtri sono ancora qui: cerca di nuovo per vedere tariffe aggiornate.';
  }
  if (reason === 'price_changed') {
    return 'Il prezzo era cambiato. I tuoi filtri sono ancora qui: cerca di nuovo se vuoi confrontare altre opzioni.';
  }
  return null;
}
