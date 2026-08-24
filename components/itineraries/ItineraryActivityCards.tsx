'use client';

import { Calendar, Sun } from 'lucide-react';
import type { ItineraryPaidActivity, ItineraryTemplate } from '@/lib/itineraries/types';
import { activityDateForDay } from '@/lib/itineraries/stay-progress';
import { cn } from '@/lib/utils';

const SLOT_LABEL = {
  morning: 'Mattina',
  afternoon: 'Pomeriggio',
  evening: 'Sera',
} as const;

function ActivityCard({
  activity,
  activityDate,
  booked,
  onSelect,
}: {
  activity: ItineraryPaidActivity;
  activityDate: string;
  booked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-2xl border p-4 text-left transition hover:border-accent/50',
        booked ? 'border-emerald-200 bg-emerald-50/50' : 'border-border bg-white'
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
        Giorno {activity.day_number} · {SLOT_LABEL[activity.slot]}
      </p>
      <p className="mt-1 font-display text-base font-semibold text-foreground">
        {activity.title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{activity.hint}</p>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Calendar className="h-3 w-3" />
        {activityDate}
        {booked ? ' · Salvata nel recap' : ' · Cerca su Viator'}
      </p>
    </button>
  );
}

export function ItineraryActivityCards({
  template,
  dateFrom,
  bookedTitles,
  onSelectActivity,
}: {
  template: ItineraryTemplate;
  dateFrom: string;
  bookedTitles: string[];
  onSelectActivity: (activity: ItineraryPaidActivity, activityDate: string) => void;
}) {
  if (!template.paid_activities.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sun className="h-4 w-4 text-accent" />
        <p className="text-sm font-semibold text-foreground">Dal piano di viaggio</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {template.paid_activities.map((activity) => {
          const activityDate = activityDateForDay(dateFrom, activity.day_number);
          const booked = bookedTitles.some(
            (t) => t.toLowerCase() === activity.title.toLowerCase()
          );
          return (
            <li key={`${activity.day_number}-${activity.title}`}>
              <ActivityCard
                activity={activity}
                activityDate={activityDate}
                booked={booked}
                onSelect={() => onSelectActivity(activity, activityDate)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
