import type { ItineraryDay, ItineraryTemplate } from '@/lib/itineraries/types';
import { templatesForDestination } from '@/lib/itineraries/catalog';

export type TripVibe = 'relax' | 'divertimento' | 'avventura';

const VIBE_STYLES: Record<TripVibe, string[]> = {
  relax: ['relax'],
  divertimento: ['entertainment', 'relax'],
  avventura: ['avventura', 'adventure', 'estremo'],
};

export function isOptionalDay(day: ItineraryDay): boolean {
  if (day.is_arrival || day.is_departure) return false;
  if (day.pois.length === 0) return true;
  return day.pois.every((p) => p.priority === 'optional');
}

/** Riduce un piano mantenendo arrivo/rientro; toglie prima i giorni optional. */
export function fitItineraryToDays(source: ItineraryTemplate, targetDays: number): ItineraryDay[] {
  if (targetDays >= source.days.length) {
    return source.days.map((d, i) => ({ ...d, day_number: i + 1 }));
  }
  if (targetDays < 2) {
    return source.days.slice(0, 2).map((d, i) => ({ ...d, day_number: i + 1 }));
  }

  let days = [...source.days];
  while (days.length > targetDays) {
    const idx = findRemovableDayIndex(days);
    if (idx === -1) break;
    days.splice(idx, 1);
  }
  return days.map((d, i) => ({ ...d, day_number: i + 1 }));
}

function findRemovableDayIndex(days: ItineraryDay[]): number {
  for (let i = days.length - 2; i >= 1; i -= 1) {
    if (isOptionalDay(days[i]!)) return i;
  }
  for (let i = days.length - 2; i >= 1; i -= 1) {
    const d = days[i]!;
    if (!d.is_arrival && !d.is_departure) return i;
  }
  return -1;
}

/** Sceglie il template pubblicato più adatto a N giorni e al vibe. */
export function pickTemplateForTrip(
  destinationSlug: string,
  tripDays: number,
  vibe?: TripVibe | null
): ItineraryTemplate | undefined {
  const list = templatesForDestination(destinationSlug).filter((t) => t.status === 'published');
  if (!list.length) return undefined;

  const styleRank = (t: ItineraryTemplate) => {
    if (!vibe) return 0;
    const styles = VIBE_STYLES[vibe];
    const s = t.style ?? 'relax';
    const idx = styles.indexOf(s);
    return idx === -1 ? styles.length : idx;
  };

  const sorted = [...list].sort((a, b) => {
    const aDiff = Math.abs(a.duration_days - tripDays);
    const bDiff = Math.abs(b.duration_days - tripDays);
    if (aDiff !== bDiff) return aDiff - bDiff;
    return styleRank(a) - styleRank(b) || a.duration_days - b.duration_days;
  });

  const base = sorted[0];
  if (!base) return undefined;
  if (base.duration_days <= tripDays) return base;

  const shorter = list
    .filter((t) => t.duration_days <= tripDays)
    .sort((a, b) => b.duration_days - a.duration_days || styleRank(a) - styleRank(b))[0];
  return shorter ?? base;
}

export function templateWithFittedDays(
  template: ItineraryTemplate,
  tripDays: number
): ItineraryTemplate {
  const days =
    tripDays < template.duration_days ? fitItineraryToDays(template, tripDays) : template.days;
  return {
    ...template,
    duration_days: days.length,
    days,
    summary: `${template.summary.split('.')[0]}. Piano adattato a ${days.length} giorni.`,
  };
}
