/**
 * Arricchisce URL affiliate con date / pax quando il partner li supporta in querystring.
 * Non rimuove pid/mcid/partner_id esistenti.
 *
 * Nota Viator: i productUrl affiliate NON documentano prefill date sul PDP
 * (landing affiliate le ignora spesso). Usiamo gli stessi nomi dei Dynamic Widget
 * ufficiali — è il best-effort lato URL. Prefill affidabile = widget o Booking API.
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
    const from = prefs.startDate?.trim();
    const to = prefs.endDate?.trim() || from;

    if (host.includes('viator.com')) {
      // Schema allineato ai Dynamic Widgets Viator (data-vi-*)
      if (from) {
        url.searchParams.set('travel-date-from', from);
        url.searchParams.set('travelDate', from);
      }
      if (to) {
        url.searchParams.set('travel-date-to', to);
      }
      url.searchParams.set('travellers-adults', String(adults));
      if (children > 0) {
        url.searchParams.set('travellers-children', String(children));
      }
      // Rimuovi param legacy che non funzionano e sporcano solo l’URL
      for (const key of [
        'date',
        'startDate',
        'endDate',
        'adults',
        'children',
        'paxAdult',
        'paxChild',
        'numAdults',
      ]) {
        url.searchParams.delete(key);
      }
      return url.toString();
    }

    if (host.includes('getyourguide.com') || host.includes('gygtest.com')) {
      if (from) url.searchParams.set('date_from', from);
      if (to) url.searchParams.set('date_to', to);
      url.searchParams.set('adults', String(adults));
      if (children > 0) url.searchParams.set('children', String(children));
      return url.toString();
    }

    return bookingUrl;
  } catch {
    return bookingUrl;
  }
}
