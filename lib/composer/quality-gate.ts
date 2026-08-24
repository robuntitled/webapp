import { differenceInCalendarDays, parseISO } from 'date-fns';

export type QualityGateIssue = {
  code: 'description' | 'dates' | 'budget' | 'min_participants';
  message: string;
};

const MIN_TITLE = 12;
const MIN_DESC = 80;
const MIN_BUDGET = 80;
const MAX_BUDGET = 8000;
const MIN_SEATS_GROUP = 3;
const MAX_SEATS_MIN = 20;

function daysSpan(start: string, end: string): number | null {
  try {
    const n = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Gate usato dai perk boost su Trip legacy (ancora in `trips` se presenti). */
export function evaluateQualityGate(input: {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string;
  budgetOrientativo?: number;
  minParticipants?: number;
  maxParticipants?: number;
  planningMode?: 'solo' | 'group';
}): QualityGateIssue[] {
  const issues: QualityGateIssue[] = [];
  const title = input.title.trim();
  if (title.length < MIN_TITLE) {
    issues.push({
      code: 'description',
      message: 'Scrivi un titolo chiaro (almeno 12 caratteri) e un itinerario con i giorni.',
    });
  }

  const prose = (input.description ?? '').trim();
  if (prose.length < MIN_DESC) {
    issues.push({
      code: 'description',
      message: 'Aggiungi una descrizione chiara: titoli dei giorni e tappe, non un elenco vuoto.',
    });
  }

  const span = daysSpan(input.startDate, input.endDate);
  if (!input.startDate || !input.endDate || !span || span < 2 || span > 45) {
    issues.push({
      code: 'dates',
      message: 'Servono date definite (almeno 2 giorni, massimo 45).',
    });
  }

  const budget = Number(input.budgetOrientativo || 0);
  if (budget < MIN_BUDGET || budget > MAX_BUDGET) {
    issues.push({
      code: 'budget',
      message:
        'Indica un budget orientativo realistico (80–8.000€ a persona). I costi reali dipendono dai servizi che ognuno prenota separatamente.',
    });
  }

  const minSeats = Number(input.minParticipants) || 0;
  const maxSeats = Number(input.maxParticipants) || 0;
  if (input.planningMode !== 'solo' && (minSeats < MIN_SEATS_GROUP || minSeats > MAX_SEATS_MIN)) {
    issues.push({
      code: 'min_participants',
      message: `Soglia del gruppo non sensata: per un Trip visibile servi ${MIN_SEATS_GROUP}–${MAX_SEATS_MIN} partecipanti minimi.`,
    });
  }
  if (maxSeats > 0 && maxSeats < minSeats) {
    issues.push({
      code: 'min_participants',
      message: 'I posti massimi devono essere almeno la soglia del gruppo.',
    });
  }

  return issues;
}

export function canPassQualityGate(input: Parameters<typeof evaluateQualityGate>[0]): boolean {
  return evaluateQualityGate(input).length === 0;
}
