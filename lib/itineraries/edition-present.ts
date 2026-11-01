/** Copy e presentazione partenze ufficiali */

import { formatEuro } from '@/lib/format/euro';

export function daysUntilDeparture(dateFrom: string): number {
  const dep = new Date(`${dateFrom.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((dep.getTime() - today.getTime()) / 86_400_000);
}

export function editionThresholdProgress(confirmed: number, minConfirmed: number): number {
  if (minConfirmed <= 0) return confirmed > 0 ? 100 : 0;
  return Math.min(100, Math.round((confirmed / minConfirmed) * 100));
}

export type EditionScarcityVariant = 'open' | 'warming' | 'closing' | 'formed';

export function editionScarcity(input: {
  confirmed_count: number;
  min_confirmed: number;
  date_from: string;
  status?: string;
  interested_count?: number;
}): { label: string; variant: EditionScarcityVariant; sublabel: string } {
  const {
    confirmed_count: confirmed,
    min_confirmed: min,
    date_from,
    status,
    interested_count = 0,
  } = input;
  const days = daysUntilDeparture(date_from);
  const enrolled = interested_count + confirmed;
  const enrolledLabel =
    enrolled > 0
      ? enrolled === 1
        ? '1 iscritto al gruppo'
        : `${enrolled} iscritti al gruppo`
      : '';

  if (status === 'formed' || confirmed >= min) {
    return {
      label: 'Gruppo confermato',
      variant: 'formed',
      sublabel: enrolledLabel || `${confirmed} viaggiatori confermati`,
    };
  }
  if (days <= 21 && days >= 0) {
    return {
      label: days === 1 ? 'Partenza tra 1 giorno' : `Partenza tra ${days} giorni`,
      variant: 'closing',
      sublabel: enrolledLabel,
    };
  }
  if (confirmed >= 1 || enrolled >= 1) {
    return {
      label: 'Gruppo in formazione',
      variant: 'warming',
      sublabel: enrolledLabel,
    };
  }
  return {
    label: 'Gruppo in formazione',
    variant: 'open',
    sublabel: enrolledLabel,
  };
}

/** Badge card — disponibilità reale, niente scarsità inventata. */
export function editionBadgeDisplay(
  scarcity: { label: string; variant: EditionScarcityVariant },
  _spotsLeft: number
): string {
  return scarcity.label;
}

export function editionParticipantsLabel(input: {
  interested_count?: number;
  confirmed_count?: number;
}): string | null {
  const enrolled = (input.interested_count ?? 0) + (input.confirmed_count ?? 0);
  if (enrolled <= 0) return null;
  return enrolled === 1 ? '👥 1 iscritto al gruppo' : `👥 ${enrolled} iscritti al gruppo`;
}

/** @deprecated UI uses iscritti al gruppo; kept for internal metrics. */
export function editionFlightsStatusLabel(confirmed: number, minConfirmed: number): string {
  const min = Math.max(minConfirmed, 1);
  return `${confirmed}/${min}`;
}

/** @deprecated */
export function editionFlightsThresholdLabel(confirmed: number, minConfirmed: number): string {
  return editionFlightsStatusLabel(confirmed, minConfirmed);
}

/** Budget orientativo per durata template — mai "prezzo del gruppo". */
export function editionBudgetOrientativeLabel(
  totalHint: number | null | undefined,
  durationDays?: number | null
): string | null {
  const amount = formatEuro(totalHint, { approx: false });
  if (!amount) return null;
  if (durationDays && durationDays > 0) {
    return `Budget orientativo · ${amount} · ${durationDays} giorni`;
  }
  return `Budget orientativo · ${amount}`;
}

export function editionGroupHint(
  _confirmed: number,
  _minConfirmed: number,
  interested_count = 0,
  confirmed_count = 0
): string {
  const enrolled = interested_count + confirmed_count;
  if (enrolled <= 0) return '';
  return enrolled === 1 ? '1 iscritto al gruppo' : `${enrolled} iscritti al gruppo`;
}

export function editionJoinReason(input: {
  confirmed_count: number;
  min_confirmed: number;
  interested_count?: number;
}): string {
  const { interested_count = 0, confirmed_count = 0 } = input;
  const enrolled = interested_count + confirmed_count;
  if (enrolled <= 0) return '';
  if (enrolled === 1) return '1 persona iscritta al gruppo';
  return `${enrolled} persone iscritte al gruppo`;
}
