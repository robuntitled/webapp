import 'server-only';

import { getLiteApiDefaultMargin } from '@/lib/liteapi/config';

/** % della commissione stimata restituita all'utente come credito (default 30). */
export function getBookingCashbackPercent(): number {
  const raw = process.env.BOOKING_CASHBACK_PERCENT?.trim();
  if (!raw) return 30;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 30;
}

/** Cap credito per singola prenotazione (centesimi). Default €50. */
export function getBookingCashbackMaxCents(): number {
  const raw = process.env.BOOKING_CASHBACK_MAX_CENTS?.trim();
  if (!raw) return 5000;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 5000;
}

export function getCommissionMarginPercent(): number {
  return getLiteApiDefaultMargin();
}
