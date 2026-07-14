import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import type { ComposerDay } from '@/types/composer';

const DAY_TITLES = [
  'Arrivo e prime scoperte',
  'Cuore dell\'avventura',
  'Esplorazione libera',
  'Highlight del viaggio',
  'Cultura e sapori',
  'Relax e panorami',
  'Ultimo giorno da ricordare',
];

function dayTitleForIndex(index: number): string {
  return DAY_TITLES[index % DAY_TITLES.length] ?? `Giorno ${index + 1}`;
}

export function buildComposerDays(startDate: string, endDate: string): ComposerDay[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const total = differenceInCalendarDays(end, start) + 1;

  return Array.from({ length: Math.max(1, total) }, (_, index) => {
    const dayIndex = index + 1;
    const date = addDays(start, index);
    return {
      dayIndex,
      date: format(date, 'yyyy-MM-dd'),
      title: dayTitleForIndex(index),
      blocks: [],
    };
  });
}

/**
 * Reindicizza i giorni (1..n) e ricalcola le date in modo contiguo a partire
 * dalla data del primo giorno. Mantiene blocchi e titoli personalizzati.
 */
export function reindexComposerDays(days: ComposerDay[]): ComposerDay[] {
  if (days.length === 0) return days;
  const anchor = parseISO(days[0].date);
  return days.map((day, index) => ({
    ...day,
    dayIndex: index + 1,
    date: format(addDays(anchor, index), 'yyyy-MM-dd'),
  }));
}

/** Aggiunge una giornata in coda (data = ultimo giorno + 1). */
export function appendComposerDay(days: ComposerDay[]): ComposerDay[] {
  if (days.length === 0) {
    const today = format(new Date(), 'yyyy-MM-dd');
    return [{ dayIndex: 1, date: today, title: dayTitleForIndex(0), blocks: [] }];
  }
  const last = days[days.length - 1];
  const nextDate = addDays(parseISO(last.date), 1);
  const nextIndex = days.length;
  return [
    ...days,
    {
      dayIndex: nextIndex + 1,
      date: format(nextDate, 'yyyy-MM-dd'),
      title: dayTitleForIndex(nextIndex),
      blocks: [],
    },
  ];
}

/** Rimuove una giornata e ricompatta indici/date. Mantiene sempre almeno 1 giorno. */
export function removeComposerDay(days: ComposerDay[], dayIndex: number): ComposerDay[] {
  if (days.length <= 1) return days;
  return reindexComposerDays(days.filter((d) => d.dayIndex !== dayIndex));
}

/** Data di fine coerente con l'ultimo giorno presente. */
export function endDateFromDays(days: ComposerDay[]): string {
  if (days.length === 0) return '';
  return days[days.length - 1].date;
}

export function formatComposerDayLabel(dateIso: string, dayIndex: number): string {
  const date = parseISO(dateIso);
  return `Giorno ${dayIndex} · ${format(date, 'EEE d MMM', { locale: it })}`;
}

export function estimateTripBudget(days: ComposerDay[]): number {
  let total = 0;
  for (const day of days) {
    for (const block of day.blocks) {
      const price =
        block.alternatives.find((a) => a.id === block.selectedAlternativeId)?.price ??
        (typeof block.content.price === 'number' ? block.content.price : 0);
      total += price ?? 0;
    }
  }
  return Math.max(total, 1);
}

export function buildTripDescriptionFromDays(days: ComposerDay[], destination: string): string {
  const lines = [`Itinerario ${destination} — composito giorno per giorno su NomadLink.\n`];
  for (const day of days) {
    lines.push(`📅 ${day.title} (${day.date})`);
    if (day.blocks.length === 0) {
      lines.push('  · Da definire');
    } else {
      for (const block of day.blocks) {
        const title =
          typeof block.content.title === 'string' ? block.content.title : block.type;
        lines.push(`  · ${title}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}