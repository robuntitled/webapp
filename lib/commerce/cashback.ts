/**
 * NomadCredits — programma loyalty, NON denaro.
 * Per restare fuori (o ai margini) del DPR 430/2001 i crediti sono inquadrati come
 * sconto sui prossimi servizi prenotati tramite NomadLink (stessa insegna,
 * art. 6 lett. c-bis DPR 430/2001): non acquistabili, non convertibili in denaro,
 * non trasferibili, con scadenza. Vedi docs/NOMADCREDITS-REGOLAMENTO.md.
 */
export const NOMAD_CREDITS_LABEL = 'NomadCredits';

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
