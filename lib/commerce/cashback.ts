export const CASHBACK = {
  creatorLaunchMin: 0.02,
  participantMin: 0.012,
  participantMax: 0.015,
} as const;

export function formatCreatorCashback(): string {
  return '2%+';
}

export function formatParticipantCashback(): string {
  return '1,2–1,5%';
}

/** Stima mid-range sul prezzo a persona (brokerage, non addebito). */
export function estimateParticipantCashbackEur(pricePerPerson: number): number {
  const price = Number.isFinite(pricePerPerson) ? Math.max(0, pricePerPerson) : 0;
  return Math.round(price * ((CASHBACK.participantMin + CASHBACK.participantMax) / 2));
}
