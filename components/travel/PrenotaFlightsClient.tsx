'use client';

import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { TripFlightBookSearch } from '@/components/trips/TripFlightBookSearch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PrenotaFlightsClient() {
  const defaults = useMemo(() => {
    const start = addDays(new Date(), 21);
    const end = addDays(start, 7);
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, []);

  const [destination, setDestination] = useState('Londra');
  const [originIata, setOriginIata] = useState('ROM');
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-border/50 bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5 text-sm">
          <Label>Destinazione</Label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Londra o LHR"
            className="h-11 rounded-xl"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <Label>Partenza IATA</Label>
          <Input
            value={originIata}
            onChange={(e) => setOriginIata(e.target.value.toUpperCase())}
            maxLength={3}
            className="h-11 rounded-xl uppercase"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <Label>Andata</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-11 rounded-xl"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <Label>Ritorno</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-11 rounded-xl"
          />
        </label>
      </div>

      <TripFlightBookSearch
        key={`${destination}-${originIata}-${startDate}-${endDate}`}
        destination={destination}
        startDate={startDate}
        endDate={endDate}
        defaultOriginIata={originIata}
        adults={1}
      />
    </div>
  );
}
