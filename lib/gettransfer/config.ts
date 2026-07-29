/** GetTransfer affiliate — Travelpayouts Partner ID (marker). */
export function getGetTransferMarker(): string | null {
  const dedicated = process.env.NEXT_PUBLIC_GETTRANSFER_MARKER?.trim();
  if (dedicated) return dedicated;
  return process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim() || null;
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
  return Boolean(getGetTransferMarker());
}
