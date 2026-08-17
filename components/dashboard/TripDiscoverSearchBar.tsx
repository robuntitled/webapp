'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfDay } from 'date-fns';
import { it as itDayPicker } from 'react-day-picker/locale';
import { type DateRange } from 'react-day-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Calendar as CalendarIcon,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  buildDiscoverSearchParams,
  formatDiscoverDateRangeLabel,
  type DiscoverSearchFilters,
} from '@/lib/trips/discover-search';

type TripDiscoverSearchBarProps = {
  variant?: 'hero' | 'compact';
  initialFilters?: DiscoverSearchFilters;
  priceBounds: { min: number; max: number };
};

export function TripDiscoverSearchBar({
  variant = 'hero',
  initialFilters,
  priceBounds,
}: TripDiscoverSearchBarProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(initialFilters?.searchTerm ?? '');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialFilters?.dateRange);
  const [priceRange, setPriceRange] = useState<[number, number]>(
    initialFilters?.priceRange ?? [priceBounds.min, priceBounds.max]
  );

  const handleSearch = () => {
    const params = buildDiscoverSearchParams({ searchTerm, dateRange, priceRange });
    router.push(`/dashboard/cerca?${params.toString()}`);
  };

  const handleReset = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setPriceRange([priceBounds.min, priceBounds.max]);
  };

  const isCompact = variant === 'compact';

  return (
    <div
      className={
        isCompact
          ? 'sticky top-16 z-20 border-b border-white/10 bg-[#0a0f1a]/90 backdrop-blur-xl'
          : 'glass-panel rounded-3xl p-6 md:p-8 max-w-4xl mx-auto'
      }
    >
      <div className={isCompact ? 'container mx-auto px-4 py-3 max-w-6xl' : ''}>
        {!isCompact && (
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-foreground">
              <Search className="h-5 w-5 text-primary" />
              <span className="font-medium">Scopri viaggi</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-muted-foreground rounded-full"
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Reset
            </Button>
          </div>
        )}

        <div className={`flex flex-col gap-3 ${isCompact ? 'md:flex-row md:items-center' : 'space-y-5'}`}>
          <div className={`relative ${isCompact ? 'flex-1 min-w-0' : ''}`}>
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 ${
                isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'
              }`}
            />
            <Input
              type="text"
              placeholder="Destinazione o chi organizza…"
              className={
                isCompact
                  ? 'h-9 pl-9 pr-8 rounded-lg text-sm'
                  : 'h-12 pl-10 pr-10 rounded-xl text-base'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`absolute top-1/2 right-0.5 -translate-y-1/2 rounded-full ${
                  isCompact ? 'h-7 w-7' : 'h-8 w-8'
                }`}
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={
                  isCompact
                    ? 'h-9 rounded-lg text-xs font-normal shrink-0'
                    : 'h-11 w-full justify-start rounded-xl font-normal'
                }
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{formatDiscoverDateRangeLabel(dateRange)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                disabled={{ before: startOfDay(new Date()) }}
                locale={itDayPicker}
                numberOfMonths={1}
                classNames={{ today: 'rounded-md' }}
              />
            </PopoverContent>
          </Popover>

          {!isCompact && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                  Prezzo a persona
                </Label>
                <span className="text-sm font-medium tabular-nums">
                  {priceRange[0]}€ – {priceRange[1]}€
                </span>
              </div>
              <Slider
                min={priceBounds.min}
                max={priceBounds.max}
                step={10}
                value={priceRange}
                onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
                className="py-2"
              />
            </div>
          )}

          {isCompact && (
            <span className="hidden lg:inline text-xs text-white/85 tabular-nums shrink-0">
              {priceRange[0]}–{priceRange[1]}€
            </span>
          )}

          <Button
            type="button"
            className={
              isCompact
                ? 'h-9 rounded-lg px-4 text-sm gap-1.5 shrink-0'
                : 'w-full h-12 rounded-xl text-base gap-2'
            }
            onClick={handleSearch}
          >
            <Search className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            Cerca
          </Button>
        </div>
      </div>
    </div>
  );
}