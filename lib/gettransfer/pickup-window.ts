/** GetTransfer spec: the pickup must be at least 24 hours in the future. */
export const MIN_HOURS_AHEAD = 24;

export const MIN_LEAD_TIME_ERROR_IT = `Il transfer deve essere prenotato con almeno ${MIN_HOURS_AHEAD} ore di anticipo.`;

/** Returns an Italian error message, or null when the pickup time is valid. */
export function validatePickupDate(dateTo: string, now = Date.now()): string | null {
  const pickup = new Date(dateTo);
  if (Number.isNaN(pickup.getTime())) {
    return 'Data o ora non valida.';
  }
  if (pickup.getTime() < now + MIN_HOURS_AHEAD * 60 * 60 * 1000) {
    return MIN_LEAD_TIME_ERROR_IT;
  }
  return null;
}
