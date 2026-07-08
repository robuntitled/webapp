'use client';

import { useState, useMemo } from 'react';
import { TripWithRelations, TripCard } from '../../../components/trips/TripCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Slider } from "@/components/ui/slider";
import { Calendar as CalendarIcon, RotateCcw, X } from 'lucide-react';
import { format } from "date-fns";
import { it } from 'date-fns/locale';
import { type Session } from 'next-auth';

// Il componente ora accetta anche la sessione
export default function DashboardClient({ initialTrips, session }: { initialTrips: TripWithRelations[], session: Session | null }) {
  const [allTrips] = useState<TripWithRelations[]>(initialTrips);
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [ageRange, setAgeRange] = useState('');
  const [priceRange, setPriceRange] = useState([50, 5000]);

  const filteredTrips = useMemo(() => {
    let [min, max] = [0, 999];
    if (ageRange) { [min, max] = ageRange.split('-').map(Number); }
    return allTrips.filter(trip => {
      const textMatch = !searchTerm || trip.title.toLowerCase().includes(searchTerm.toLowerCase()) || trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
      const dateMatch = !date || (trip.startDate && new Date(trip.startDate) >= date);
      const ageMatch = !ageRange || (trip.minAge >= min && trip.maxAge <= max);
      const minPrice = priceRange[0];
      const maxPrice = priceRange[1];
      const priceMatch = Number(trip.price) >= minPrice && (maxPrice === 5000 ? true : Number(trip.price) <= maxPrice);
      return textMatch && dateMatch && ageMatch && priceMatch;
    });
  }, [allTrips, searchTerm, date, ageRange, priceRange]);

  const handleResetFilters = () => {
    setSearchTerm(''); setDate(undefined); setAgeRange(''); setPriceRange([50, 5000]);
  };

  return (
    <div className="relative z-0 container mx-auto px-4 pt-12 pb-24">
      <div className="text-center max-w-3xl mx-auto mb-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-white">Inizia la tua ricerca.</h1>
        <p className="mt-4 text-lg text-slate-200">Filtra i viaggi per trovare l'avventura perfetta per te.</p>
      </div>
      <div className="mt-8 p-6 max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
        <div className="flex justify-end mb-4 -mt-2 -mr-2"><Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-slate-500"><RotateCcw className="mr-2 h-3 w-3"/>Resetta Filtri</Button></div>
        <div className="space-y-4">
          <div className="space-y-2"><Label className="font-medium">Cerca ovunque</Label><div className="relative"><Input type="text" placeholder="Destinazione..." className="h-11 pr-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />{searchTerm && <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-full px-3" onClick={() => setSearchTerm('')}><X className="h-4 w-4" /></Button>}</div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="font-medium">A partire da</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className="h-11 w-full justify-start text-left font-normal pr-2"><CalendarIcon className="mr-2 h-4 w-4" /><span className="flex-grow">{date ? format(date, "PPP", { locale: it }) : <span>Qualsiasi data</span>}</span>{date && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -mr-2" onClick={(e) => {e.stopPropagation(); setDate(undefined);}}><X className="h-4 w-4" /></Button>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={{ before: new Date() }} /></PopoverContent></Popover></div>
            <div className="space-y-2"><Label className="font-medium">Fascia d'età</Label><Select value={ageRange} onValueChange={(value) => { setAgeRange(value === 'all' ? '' : value); }}><SelectTrigger className="h-11"><SelectValue placeholder="Qualsiasi età" /></SelectTrigger><SelectContent><SelectItem value="all">Tutte le Età</SelectItem><SelectItem value="18-25">18-25</SelectItem><SelectItem value="26-35">26-35</SelectItem><SelectItem value="36-45">36-45</SelectItem><SelectItem value="46-59">46-59</SelectItem><SelectItem value="60-999">60+</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2 pt-2"><Label className="flex justify-between font-medium"><span>Range di Prezzo</span><span className="font-bold text-blue-600">{priceRange[0]}€ - {priceRange[1] === 5000 ? '5000+' : `${priceRange[1]}€`}</span></Label><Slider value={priceRange} onValueChange={setPriceRange} max={5000} min={50} step={50} className="mt-2 py-2" /></div>
        </div>
      </div>
      <div className="mt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTrips.map((trip) => (<TripCard key={trip.id} trip={trip} session={session} />))}
        </div>
      </div>
    </div>
  );
}