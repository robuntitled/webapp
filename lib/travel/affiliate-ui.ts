import { addDays, format } from 'date-fns';
import type { AffiliateSortKey } from '@/components/travel/PrenotaAffiliateSearchBar';

export function defaultAffiliateDates() {
  const start = addDays(new Date(), 7);
  const end = addDays(start, 3);
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
}

export function sortAffiliateByKey<
  T extends { priceFrom?: number | null; rating?: number | null },
>(list: T[], sort: AffiliateSortKey): T[] {
  const next = [...list];
  if (sort === 'price_asc') {
    next.sort(
      (a, b) =>
        (a.priceFrom ?? Number.POSITIVE_INFINITY) -
        (b.priceFrom ?? Number.POSITIVE_INFINITY)
    );
  } else if (sort === 'price_desc') {
    next.sort((a, b) => (b.priceFrom ?? -1) - (a.priceFrom ?? -1));
  } else if (sort === 'rating') {
    next.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }
  return next;
}

/** Pulizia testo descrizione partner (HTML / whitespace). */
export function cleanAffiliateDescription(raw: string | null | undefined, max = 320): string | null {
  if (!raw?.trim()) return null;
  const text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}
