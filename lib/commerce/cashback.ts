/**
 * Cashback % rimosso: i punti sono per azioni, senza valore monetario.
 * Funzioni lasciate a 0 per non far partire crediti in euro da codice legacy.
 */
export const NOMAD_CREDITS_LABEL = 'NomadPoints';

export const CASHBACK = {
  creatorLaunchMin: 0,
  participantMin: 0,
  participantMax: 0,
} as const;

export type CashbackRole = 'creator' | 'participant';

export function cashbackRateForRole(_role: CashbackRole): number {
  return 0;
}

export function estimateCashbackEur(_amountEur: number, _role: CashbackRole): number {
  return 0;
}

export function formatCreatorCashback(): string {
  return 'NomadPoints';
}

export function formatParticipantCashback(): string {
  return 'NomadPoints';
}

export function estimateParticipantCashbackEur(_pricePerPerson: number): number {
  return 0;
}

export function estimateCreatorCashbackEur(_pricePerPerson: number): number {
  return 0;
}
