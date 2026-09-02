import type { ItineraryTemplate } from '@/lib/itineraries/types';

export const SLOT_META = {
  morning: { label: 'Mattina' },
  afternoon: { label: 'Pomeriggio' },
  evening: { label: 'Sera' },
} as const;

export type DaySlot = keyof typeof SLOT_META;

export function slotsForDay(template: ItineraryTemplate, dayNumber: number) {
  const day = template.days.find((d) => d.day_number === dayNumber);
  const acts = template.paid_activities.filter((a) => a.day_number === dayNumber);
  const bySlot: Record<DaySlot, string[]> = {
    morning: acts.filter((a) => a.slot === 'morning').map((a) => a.title),
    afternoon: acts.filter((a) => a.slot === 'afternoon').map((a) => a.title),
    evening: acts.filter((a) => a.slot === 'evening').map((a) => a.title),
  };

  if (acts.length === 0 && day) {
    const pois = day.pois.map((p) => p.name);
    bySlot.morning = pois.slice(0, 2);
    bySlot.afternoon = pois.slice(2, 4);
    bySlot.evening = pois.slice(4);
    if (!pois.length) {
      bySlot.morning = [day.description];
    }
  }

  return { day, bySlot };
}

export function areaStopsForTemplate(template: ItineraryTemplate) {
  const seen = new Set<string>();
  const out: { segment: string; day: number }[] = [];
  for (const day of template.days) {
    const seg = day.area_segment.trim();
    if (!seg) continue;
    const key = seg.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ segment: seg, day: day.day_number });
  }
  return out;
}
