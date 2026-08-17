'use client';

import type { ReactNode } from 'react';
import { startOfDay } from 'date-fns';
import { it as itDayPicker } from 'react-day-picker/locale';
import { type DateRange } from 'react-day-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import {
  Calendar as CalendarIcon,
  Euro,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  formatDiscoverDateRangeLabel,
  type DiscoverSearchFilters,
  type DurationFilter,
  type StatusFilter,
} from '@/lib/trips/discover-search';
import { DESTINATION_REGIONS } from '@/lib/composer/destinations';
import { cn } from '@/lib/utils';

const DURATION_CHIPS: { id: DurationFilter; label: string }[] = [
  { id: 'any', label: 'Qualsiasi durata' },
  { id: 'weekend', label: 'Ponte / 3-4 gg' },
  { id: 'week', label: '5–8 giorni' },
  { id: 'long', label: '10+ giorni' },
];

const STATUS_CHIPS: { id: StatusFilter; label: string }[] = [
  { id: 'any', label: 'Tutti' },
  { id: 'forming', label: 'In formazione' },
  { id: 'closing', label: 'In chiusura' },
  { id: 'last', label: 'Ultimi posti' },
];

type TripDiscoverSearchBarProps = {
  filters: DiscoverSearchFilters;
  onChange: (next: DiscoverSearchFilters) => void;
  onSubmit?: () => void;
  priceBounds: { min: number; max: number };
};

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition',
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
      )}
    >
      {children}
    </button>
  );
}

export function TripDiscoverSearchBar({
  filters,
  onChange,
  onSubmit,
  priceBounds,
}: TripDiscoverSearchBarProps) {
  const patch = (partial: Partial<DiscoverSearchFilters>) =>
    onChange({ ...filters, ...partial });

  const handleSearch = () => {
    onSubmit?.();
  };

  return (
    <div className="sticky top-16 z-30 border-b border-white/10 bg-[#070b12]/75 backdrop-blur-xl">
      <div className="container mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Dove vuoi andare?"
              className="h-11 border-0 bg-transparent pl-10 pr-8 text-sm text-slate-900 shadow-none focus-visible:ring-0"
              value={filters.searchTerm}
              onChange={(e) => patch({ searchTerm: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {filters.searchTerm ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700"
                onClick={() => patch({ searchTerm: '' })}
                aria-label="Pulisci ricerca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 shrink-0 justify-start rounded-xl px-3 text-sm font-normal text-slate-800"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                <span className="truncate">{formatDiscoverDateRangeLabel(filters.dateRange)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl" align="start">
              <Calendar
                mode="range"
                selected={filters.dateRange}
                onSelect={(range: DateRange | undefined) => patch({ dateRange: range })}
                disabled={{ before: startOfDay(new Date()) }}
                locale={itDayPicker}
                numberOfMonths={1}
                classNames={{ today: 'rounded-md' }}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 shrink-0 justify-start rounded-xl px-3 text-sm font-normal text-slate-800"
              >
                <Euro className="mr-2 h-4 w-4 text-slate-500" />
                {filters.priceRange[0]}–{filters.priceRange[1]}€
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 rounded-xl p-4" align="end">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Budget a persona
              </p>
              <Slider
                min={priceBounds.min}
                max={priceBounds.max}
                step={10}
                value={filters.priceRange}
                onValueChange={(v) =>
                  patch({ priceRange: [v[0], v[1]] as [number, number] })
                }
              />
              <p className="mt-2 text-sm tabular-nums text-slate-800">
                {filters.priceRange[0]}€ – {filters.priceRange[1]}€
              </p>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            className="h-11 shrink-0 rounded-xl px-5 text-sm"
            onClick={handleSearch}
          >
            <Search className="mr-1.5 h-4 w-4" />
            Cerca
          </Button>
        </div>

        <div className="mt-2 flex items-start gap-2 overflow-x-auto pb-1">
          <SlidersHorizontal className="mt-1.5 h-3.5 w-3.5 shrink-0 text-white/70" />
          <div className="flex flex-wrap gap-1.5">
            {DURATION_CHIPS.map((chip) => (
              <Chip
                key={chip.id}
                active={filters.duration === chip.id}
                onClick={() => patch({ duration: chip.id })}
              >
                {chip.label}
              </Chip>
            ))}
            {STATUS_CHIPS.map((chip) => (
              <Chip
                key={chip.id}
                active={filters.status === chip.id}
                onClick={() => patch({ status: chip.id })}
              >
                {chip.label}
              </Chip>
            ))}
            {DESTINATION_REGIONS.slice(0, 5).map((region) => (
              <Chip
                key={region}
                active={filters.region === region}
                onClick={() => patch({ region: filters.region === region ? '' : region })}
              >
                {region}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
