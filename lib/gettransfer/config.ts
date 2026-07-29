/** GetTransfer on Travelpayouts — program/promo id (`p=` in tp.media links). */
export const GETTRANSFER_TRAVELPAYOUTS_PROMO_ID = 4439;

/** GetTransfer affiliate — Travelpayouts Partner ID (marker). */
export function getGetTransferMarker(): string | null {
  const dedicated = process.env.NEXT_PUBLIC_GETTRANSFER_MARKER?.trim();
  if (dedicated) return dedicated;
  return process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim() || null;
}

/** Numeric Travelpayouts program id for GetTransfer (`p=`). Env overrides default. */
export function getGetTransferPromoId(): number | null {
  const raw =
    process.env.NEXT_PUBLIC_GETTRANSFER_PROMO_ID?.trim() ||
    process.env.NEXT_PUBLIC_TRAVELPAYOUTS_GETTRANSFER_P?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return GETTRANSFER_TRAVELPAYOUTS_PROMO_ID;
}

export function getGetTransferSubId(): string {
  return process.env.NEXT_PUBLIC_GETTRANSFER_SUBID?.trim() || 'prenota_taxi';
}

export function getGetTransferBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_GETTRANSFER_BASE_URL?.replace(/\/$/, '') ||
    'https://gettransfer.com'
  );
}

export function isGetTransferAffiliateConfigured(): boolean {
  return Boolean(getGetTransferMarker() && getGetTransferPromoId());
}
