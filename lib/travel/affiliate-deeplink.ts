/**
 * Arricchisce URL affiliate con date / pax quando il partner li supporta in querystring.
 * Non rimuove pid/mcid/partner_id esistenti.
 */
export function withAffiliateBookingPrefs(
  bookingUrl: string,
  prefs: {
    startDate?: string;
    endDate?: string;
    adults?: number;
    children?: number;
  }
): string {
  try {
    const url = new URL(bookingUrl);
    const host = url.hostname.replace(/^www\./, '');
    const adults = Math.min(Math.max(prefs.adults ?? 2, 1), 20);
    const children = Math.min(Math.max(prefs.children ?? 0, 0), 20);

    if (host.includes('viator.com')) {
      if (prefs.startDate) {
        url.searchParams.set('date', prefs.startDate);
        url.searchParams.set('startDate', prefs.startDate);
      }
      if (prefs.endDate) url.searchParams.set('endDate', prefs.endDate);
      // Best-effort: Viator non documenta ufficialmente tutti i param, ma questi
      // vengono spesso applicati sulla pagina prodotto / attrazione.
      url.searchParams.set('adults', String(adults));
      url.searchParams.set('paxAdult', String(adults));
      url.searchParams.set('numAdults', String(adults));
      if (children > 0) {
        url.searchParams.set('children', String(children));
        url.searchParams.set('paxChild', String(children));
      }
      return url.toString();
    }

    if (host.includes('getyourguide.com') || host.includes('gygtest.com')) {
      if (prefs.startDate) url.searchParams.set('date_from', prefs.startDate);
      if (prefs.endDate) url.searchParams.set('date_to', prefs.endDate);
      url.searchParams.set('adults', String(adults));
      if (children > 0) url.searchParams.set('children', String(children));
      return url.toString();
    }

    return bookingUrl;
  } catch {
    return bookingUrl;
  }
}
