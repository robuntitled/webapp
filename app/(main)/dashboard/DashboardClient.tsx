'use client';

import { useState, useMemo } from 'react';
import { TripCard } from '@/components/trips/TripCard';
import type { TripWithRelations } from '@/types/trip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calendar as CalendarIcon, RotateCcw, X, Search, Compass } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { type Session } from 'next-auth';
import Link from 'next/link';

export default function DashboardClient({
  initialTrips,
  session,
}: {
  initialTrips: TripWithRelations[];
  session: Session | null;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [ageRange, setAgeRange] = useState('');
  const [priceRange, setPriceRange] = useState([50, 5000]);

  const filteredTrips = useMemo(() => {
    let [min, max] = [0, 999];
    if (ageRange) {
      [min, max] = ageRange.split('-').map(Number);
    }
    return initialTrips.filter((trip) => {
      const textMatch =
        !searchTerm ||
        trip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
      const dateMatch = !date || (trip.startDate && new Date(trip.startDate) >= date);
      const ageMatch = !ageRange || (trip.minAge <= max && trip.maxAge >= min);
      const minPrice = priceRange[0];
      const maxPrice = priceRange[1];
      const priceMatch =
        Number(trip.price) >= minPrice &&
        (maxPrice === 5000 ? true : Number(trip.price) <= maxPrice);
      return textMatch && dateMatch && ageMatch && priceMatch;
    });
  }, [initialTrips, searchTerm, date, ageRange, priceRange]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDate(undefined);
    setAgeRange('');
    setPriceRange([50, 5000]);
  };

  return (
    <div className="relative z-0 container mx-auto px-4 pt-10 pb-24">
      <div className="text-center max-w-3xl mx-auto mb-10">
        <p className="text-accent font-medium text-sm uppercase tracking-widest mb-3">
          Esplora il mondo
        </p>
        <h1 className="font-display text-4xl md:text-6xl font-semibold text-white leading-tight">
          Dove ti porta il prossimo viaggio?
        </h1>
        <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
          Scopri avventure di gruppo selezionate — ogni destinazione raccontata in prima persona.
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-foreground">
            <Search className="h-5 w-5 text-primary" />
            <span className="font-medium">Cerca il tuo viaggio</span>
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
              placeholder="Destinazione, paese, esperienza..."
              className="h-12 pl-10 pr-10 rounded-xl text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                Partenza dal
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 w-full justify-start rounded-xl font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                    {date ? format(date, 'PPP', { locale: it }) : 'Qualsiasi data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={{ before: new Date() }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                Fascia d&apos;età
              </Label>
              <Select
                value={ageRange}
                onValueChange={(v) => setAgeRange(v === 'all' ? '' : v)}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Qualsiasi età" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le età</SelectItem>
                  <SelectItem value="18-25">18–25</SelectItem>
                  <SelectItem value="26-35">26–35</SelectItem>
                  <SelectItem value="36-45">36–45</SelectItem>
                  <SelectItem value="46-59">46–59</SelectItem>
                  <SelectItem value="60-999">60+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <Label className="flex justify-between text-muted-foreground text-xs uppercase tracking-wide">
              <span>Budget</span>
              <span className="font-semibold text-accent normal-case tracking-normal text-sm">
                {priceRange[0]}€ – {priceRange[1] === 5000 ? '5.000+' : `${priceRange[1]}€`}
              </span>
            </Label>
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              max={5000}
              min={50}
              step={50}
              className="py-2"
            />
          </div>
        </div>
      </div>

      <div className="mt-14">
        {filteredTrips.length > 0 ? (
          <>
            <p className="text-white/60 text-sm mb-6">
              {filteredTrips.length} {filteredTrips.length === 1 ? 'viaggio' : 'viaggi'}{' '}
              {searchTerm || date || ageRange ? 'trovati' : 'disponibili'}
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
              Prova a modificare i filtri o{' '}
              {session?.user ? (
                <Link href="/dashboard/crea" className="text-accent hover:underline font-medium">
                  crea il primo viaggio
                </Link>
              ) : (
                'torna più tardi'
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}