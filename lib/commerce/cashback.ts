export const CASHBACK = {
  creatorLaunchMin: 0.02,
  participantMin: 0.012,
  participantMax: 0.015,
} as const;

export type CashbackRole = 'creator' | 'participant';

export function cashbackRateForRole(role: CashbackRole): number {
  return role === 'creator'
    ? CASHBACK.creatorLaunchMin
    : (CASHBACK.participantMin + CASHBACK.participantMax) / 2;
}

export function estimateCashbackEur(amountEur: number, role: CashbackRole): number {
  const amount = Number.isFinite(amountEur) ? Math.max(0, amountEur) : 0;
  return Math.round(amount * cashbackRateForRole(role) * 100) / 100;
}

export function formatCreatorCashback(): string {
  return '2%+';
}

export function formatParticipantCashback(): string {
  return '1,2–1,5%';
}

/** Stima mid-range sul prezzo a persona (brokerage, non addebito). */
export function estimateParticipantCashbackEur(pricePerPerson: number): number {
  return Math.round(estimateCashbackEur(pricePerPerson, 'participant'));
}

export function estimateCreatorCashbackEur(pricePerPerson: number): number {
  return Math.round(estimateCashbackEur(pricePerPerson, 'creator'));
}
