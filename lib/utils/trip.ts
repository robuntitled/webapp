export type TripStatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export function isTripStarted(startDate: string): boolean {
  const now = new Date();
  const start = new Date(startDate);
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return now >= start;
}

export function getTripStatus(
  startDate: string,
  endDate: string
): { text: string; variant: TripStatusVariant } {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (now > end) return { text: 'Concluso', variant: 'secondary' };
  if (now >= start && now <= end) return { text: 'In Corso', variant: 'destructive' };
  return { text: 'Prossimamente', variant: 'default' };
}

export function formatTripDate(dateString: string): string {
  if (!dateString) return 'N/D';
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  });
}

export function formatAgeRange(min: number, max: number): string {
  if (max >= 999) return `${min}+ Anni`;
  return `${min}-${max} Anni`;
}