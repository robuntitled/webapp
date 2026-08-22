'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { startPracticeAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { datesForDuration } from '@/lib/itineraries/dates';
import type { TravelMode } from '@/lib/itineraries/types';

export function StartPracticeForm({
  templateId,
  mode,
  durationDays,
}: {
  templateId: string;
  mode: Exclude<TravelMode, 'group'>;
  durationDays: number;
}) {
  const [date, setDate] = useState<Date>();
  const [pending, startTransition] = useTransition();
  const range = date
    ? datesForDuration(format(date, 'yyyy-MM-dd'), durationDays)
    : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!date) {
          toast.error('Scegli il giorno di partenza.');
          return;
        }
        startTransition(async () => {
          const result = await startPracticeAction({
            templateId,
            mode,
            dateFrom: format(date, 'yyyy-MM-dd'),
          });
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-start">
            <CalendarIcon className="h-4 w-4" />
            {date ? format(date, 'd MMMM yyyy', { locale: it }) : 'Data di partenza'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(d) => d < new Date()}
          />
        </PopoverContent>
      </Popover>
      {range ? (
        <p className="text-sm text-muted-foreground">
          Rientro {format(new Date(range.date_to), 'd MMMM yyyy', { locale: it })} · {durationDays}{' '}
          giorni
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {mode === 'friends' ? 'Apri edizione privata' : 'Apri la pratica'}
      </Button>
    </form>
  );
}
