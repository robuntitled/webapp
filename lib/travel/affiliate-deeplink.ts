export type AffiliateBookingPrefs = {
  startDate?: string;
  endDate?: string;
  adults?: number;
  children?: number;
};

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

function normalizeIsoDate(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v || !YYYY_MM_DD.test(v)) return undefined;
  return v;
}

/**
 * Arricchisce URL affiliate Viator con date / pax, senza alterare il path del
 * prodotto/attrazione né i parametri di attribuzione (pid, mcid, medium, …).
 *
 * Contesto ufficiale:
 * - I `productUrl` / `attractionUrl` API puntano di default a un lander affiliate
 *   “conversion-optimized” (lista destinazione), non al PDP specifico.
 *   `target_lander=NONE` forza il product/attraction page reale.
 * - Prefill date/pax sul PDP non è documentato; usiamo i nomi dei Dynamic Widget
 *   (`travel-date-from`, `travellers-adults`, …) + `date` come alias booking panel.
 */
export function withAffiliateBookingPrefs(
  bookingUrl: string,
  prefs: AffiliateBookingPrefs
): string {
  const raw = bookingUrl?.trim();
  if (!raw) return bookingUrl;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '');
    if (!host.includes('viator.com')) return raw;

    const adults = Math.min(Math.max(Math.floor(prefs.adults ?? 2), 1), 20);
    const children = Math.min(Math.max(Math.floor(prefs.children ?? 0), 0), 20);
    const from = normalizeIsoDate(prefs.startDate);
    const to = normalizeIsoDate(prefs.endDate) || from;

    // Atterraggio sul PDP/attraction page, non sul lander generico destinazione.
    url.searchParams.set('target_lander', 'NONE');

    if (from) {
      // Dynamic Widget / partner URL conventions
      url.searchParams.set('travel-date-from', from);
      // Alias tipici del booking panel PDP
      url.searchParams.set('date', from);
      url.searchParams.set('travelDate', from);
    }
    if (to) {
      url.searchParams.set('travel-date-to', to);
    }

    url.searchParams.set('travellers-adults', String(adults));
    url.searchParams.set('adults', String(adults));

    if (children > 0) {
      url.searchParams.set('travellers-children', String(children));
      url.searchParams.set('children', String(children));
    } else {
      url.searchParams.delete('travellers-children');
      url.searchParams.delete('children');
      url.searchParams.delete('travellers-children-ages');
    }

    // Rimuovi alias obsoleti/conflicting che a volte arrivano da cache o vecchi link
    for (const key of [
      'startDate',
      'endDate',
      'paxAdult',
      'paxChild',
      'numAdults',
      'numChildren',
    ]) {
      url.searchParams.delete(key);
    }

    return url.toString();
  } catch {
    return bookingUrl;
  }
}
