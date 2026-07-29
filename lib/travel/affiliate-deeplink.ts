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

/** Parametri query che non precompilano il PDP Viator (o confondono). */
const STRIP_KEYS = [
  'date',
  'startDate',
  'endDate',
  'adults',
  'children',
  'travellers-adults',
  'travellers-children',
  'travellers-children-ages',
  'travel-date-from',
  'travel-date-to',
  'paxAdult',
  'paxChild',
  'numAdults',
  'numChildren',
  'numberOfAdults',
  'numberOfChildren',
  'paxMix',
] as const;

/**
 * Arricchisce URL affiliate Viator con preferenze booking.
 *
 * Verificato sul PDP viator.com (lug 2026):
 * - `travelDate=YYYY-MM-DD` precompila il date picker (param usato anche da Viator
 *   sui propri link prodotto).
 * - Adulti/bambini non sono supportati via query string sul PDP affiliate: restano
 *   al default prodotto (di solito 2) o alla sessione listing su viator.com.
 *   I param Dynamic Widget (`travellers-adults`, …) valgono solo per gli embed.
 *
 * `target_lander=NONE` apre il PDP prodotto invece del lander destinazione.
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

    for (const key of STRIP_KEYS) {
      url.searchParams.delete(key);
    }

    url.searchParams.set('target_lander', 'NONE');

    const from = normalizeIsoDate(prefs.startDate);
    if (from) {
      url.searchParams.set('travelDate', from);
    }

    // Prefs pax accettate dal tipo per la UI NomadLink, ma non serializzate:
    // Viator le ignora sul productUrl affiliate.
    void prefs.endDate;
    void prefs.adults;
    void prefs.children;

    return url.toString();
  } catch {
    return bookingUrl;
  }
}
