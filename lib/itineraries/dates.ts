import { addDays, format, parseISO } from 'date-fns';

export function datesForDuration(dateFrom: string, durationDays: number) {
  const from = parseISO(dateFrom);
  return {
    date_from: format(from, 'yyyy-MM-dd'),
    date_to: format(addDays(from, durationDays - 1), 'yyyy-MM-dd'),
  };
}

export function formatItDate(iso: string) {
  return format(parseISO(iso.slice(0, 10)), 'dd/MM/yyyy');
}
