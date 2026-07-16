'use client';

import { useState, useMemo } from 'react';
import { TripCard } from '@/components/trips/TripCard';
import type { TripWithRelations } from '@/types/trip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, RotateCcw, X, Search, Compass, Plus } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { it as itDayPicker } from 'react-day-picker/locale';
import { type DateRange } from 'react-day-picker';
import { type Session } from 'next-auth';
import Link from 'next/link';

type AppliedFilters = {
  searchTerm: string;
  dateRange: DateRange | undefined;
  priceRange: [number, number];
  friendsOnly: boolean;
};

function formatDateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return 'Qualsiasi periodo';
  if (!range.to) return format(range.from, 'd MMM yyyy', { locale: it });
  return `${format(range.from, 'd MMM yyyy', { locale: it })} – ${format(range.to, 'd MMM yyyy', { locale: it })}`;
}

function tripMatchesFilters(trip: TripWithRelations, filters: AppliedFilters): boolean {
  const { searchTerm, dateRange, priceRange, friendsOnly } = filters;
  const q = searchTerm.trim().toLowerCase();

  const textMatch =
    !q ||
    trip.title.toLowerCase().includes(q) ||
    trip.destination.toLowerCase().includes(q) ||
    (trip.creator?.first_name?.toLowerCase().includes(q) ?? false);

  let dateMatch = true;
  if (dateRange?.from && trip.startDate) {
    const tripStart = startOfDay(new Date(trip.startDate));
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? startOfDay(dateRange.to) : from;
    dateMatch = tripStart >= from && tripStart <= to;
  }

  const price = Number(trip.price) || 0;
  const priceMatch = price >= priceRange[0] && price <= priceRange[1];

  const mode = trip.planningMode ?? 'group';
  const modeMatch = !friendsOnly || mode === 'group';

  return textMatch && dateMatch && priceMatch && modeMatch;
}

export default function DashboardClient({
  initialTrips,
  session,
}: {
  initialTrips: TripWithRelations[];
  session: Session | null;
}) {
  const priceBounds = useMemo(() => {
    const prices = initialTrips.map((t) => Number(t.price) || 0).filter((p) => p >= 0);
    const dataMax = prices.length ? Math.max(...prices) : 500;
    const max = Math.max(500, Math.ceil(dataMax / 50) * 50);
    return { min: 0, max };
  }, [initialTrips]);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [priceRange, setPriceRange] = useState<[number, number]>([priceBounds.min, priceBounds.max]);
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);

  const filteredTrips = useMemo(() => {
    if (!hasSearched || !appliedFilters) return [];
    return initialTrips.filter((trip) => tripMatchesFilters(trip, appliedFilters));
  }, [initialTrips, hasSearched, appliedFilters]);

  const handleSearch = () => {
    setAppliedFilters({
      searchTerm,
      dateRange,
      priceRange,
      friendsOnly,
    });
    setHasSearched(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setPriceRange([priceBounds.min, priceBounds.max]);
    setFriendsOnly(false);
    setHasSearched(false);
    setAppliedFilters(null);
  };

  return (
    <div className="relative z-0 container mx-auto px-4 pt-10 pb-24">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <p className="text-accent font-medium text-sm uppercase tracking-widest mb-3">
          Meno WhatsApp, più viaggio
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-semibold text-white leading-tight">
          Trova un viaggio e unisciti in modalità relax
        </h1>
        <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
          Qui gli amici organizzano al posto tuo. Tu guardi il piano, i prezzi e dici solo
          &quot;ci sto&quot; — zero Excel, zero caos di gruppo.
        </p>
        {session?.user && (
          <Button asChild className="mt-6 rounded-full gap-2">
            <Link href="/dashboard/crea">
              <Plus className="h-4 w-4" />
              Organizza il tuo viaggio
            </Link>
          </Button>
        )}
      </div>

      <div className="glass-panel rounded-3xl p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-foreground">
            <Search className="h-5 w-5 text-primary" />
            <span className="font-medium">Scopri viaggi</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs text-muted-foreground rounded-full"
          >
            <RotateCcw className="mr-1.5 h-3 w-3" />
            Reset
          </Button>
        </div>

        <div className="space-y-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Destinazione o nome dell'organizzatore..."
              className="h-12 pl-10 pr-10 rounded-xl text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8 rounded-full"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                Partenza dal / al
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 w-full justify-start rounded-xl font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{formatDateRangeLabel(dateRange)}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                    disabled={{ before: new Date() }}
                    locale={itDayPicker}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                Tipo di viaggio
              </Label>
              <Button
                type="button"
                variant={friendsOnly ? 'default' : 'outline'}
                className="h-11 w-full justify-start rounded-xl font-normal"
                onClick={() => setFriendsOnly((v) => !v)}
              >
                🎉 Con gli amici
              </Button>
            </div>
          </div>

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
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{priceBounds.min}€</span>
              <span>{priceBounds.max}€+</span>
            </div>
          </div>

          <Button
            type="button"
            className="w-full h-12 rounded-xl text-base gap-2"
            onClick={handleSearch}
          >
            <Search className="h-4 w-4" />
            Cerca viaggi
          </Button>
        </div>
      </div>

      <div className="mt-14">
        {!hasSearched ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-6">
              <Search className="h-8 w-8 text-accent" />
            </div>
            <h3 className="font-display text-2xl text-white font-semibold">
              Imposta i filtri e cerca
            </h3>
            <p className="mt-2 text-white/60 max-w-md mx-auto">
              Scegli destinazione, date, prezzo e tipo di viaggio — i risultati compariranno qui
              sotto.
            </p>
          </div>
        ) : filteredTrips.length > 0 ? (
          <>
            <p className="text-white/60 text-sm mb-6">
              {filteredTrips.length} {filteredTrips.length === 1 ? 'viaggio' : 'viaggi'} trovati
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} session={session} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-6">
              <Compass className="h-8 w-8 text-accent" />
            </div>
            <h3 className="font-display text-2xl text-white font-semibold">
              Nessun viaggio trovato
            </h3>
            <p className="mt-2 text-white/60 max-w-md mx-auto">
              {session?.user ? (
                <>
                  Prova ad allargare date o prezzo, oppure{' '}
                  <Link href="/dashboard/crea" className="text-accent hover:underline font-medium">
                    crea un viaggio
                  </Link>{' '}
                  e invita gli amici svogliati.
                </>
              ) : (
                'Accedi per scoprire i viaggi organizzati dagli amici.'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}