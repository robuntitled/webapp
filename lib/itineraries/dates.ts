import { addDays, format, parseISO } from 'date-fns';
import type { ItineraryTemplate } from '@/lib/itineraries/types';

const STAY_CITY: Record<string, string> = {
  Bangkok: 'Bangkok',
  Islands: 'Koh Samui',
  North: 'Chiang Mai',
};

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

export type HotelStay = {
  label: string;
  city: string;
  checkin: string;
  checkout: string;
};

export function staysFromTemplate(template: ItineraryTemplate, dateFrom: string): HotelStay[] {
  const from = parseISO(dateFrom.slice(0, 10));
  const segs: { label: string; startDay: number; endDay: number }[] = [];
  for (const day of template.days) {
    if (day.is_departure) continue;
    const last = segs[segs.length - 1];
    if (last && last.label === day.area_segment) {
      last.endDay = day.day_number;
    } else {
      segs.push({ label: day.area_segment, startDay: day.day_number, endDay: day.day_number });
    }
  }
  return segs
    .map((s) => ({
      label: s.label,
      city: STAY_CITY[s.label] ?? s.label,
      checkin: format(addDays(from, s.startDay - 1), 'yyyy-MM-dd'),
      checkout: format(addDays(from, s.endDay), 'yyyy-MM-dd'),
    }))
    .filter((s) => s.checkin < s.checkout);
}
