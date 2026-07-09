'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { searchPexelsImages } from '@/actions/images';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Image as ImageIcon, RotateCw } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { FlightPriceEstimate } from '@/components/travel/FlightPriceEstimate';
import type { TripWithRelations } from '@/types/trip';

type PexelsImage = {
  id: number;
  description: string;
  urls: { small: string; regular: string };
};

type TripFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  initialTrip?: TripWithRelations;
};

const AGE_RANGES = [
  { label: '18+', value: '18-999' },
  { label: '18-25', value: '18-25' },
  { label: '26-35', value: '26-35' },
  { label: '36-45', value: '36-45' },
  { label: '46-59', value: '46-59' },
  { label: '60+', value: '60-999' },
];

function getAgeRangeValue(minAge: number, maxAge: number) {
  const match = AGE_RANGES.find((range) => {
    const [min, max] = range.value.split('-').map(Number);
    return min === minAge && max === maxAge;
  });
  return match?.value ?? '';
}

export function TripForm({ action, submitLabel, initialTrip }: TripFormProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialTrip?.startDate ? new Date(initialTrip.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialTrip?.endDate ? new Date(initialTrip.endDate) : undefined
  );
  const [destination, setDestination] = useState(initialTrip?.destination ?? '');
  const [minAge, setMinAge] = useState(initialTrip?.minAge?.toString() ?? '');
  const [maxAge, setMaxAge] = useState(initialTrip?.maxAge?.toString() ?? '');
  const [ageRange, setAgeRange] = useState(
    initialTrip ? getAgeRangeValue(initialTrip.minAge, initialTrip.maxAge) : ''
  );
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageResults, setImageResults] = useState<PexelsImage[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState(initialTrip?.imageUrl ?? '');
  const [pexelsPage, setPexelsPage] = useState(1);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [planningMode, setPlanningMode] = useState<'solo' | 'group'>(
    initialTrip?.planningMode ?? 'group'
  );

  const handleImageSearch = async () => {
    if (!destination) return;
    setIsSearchingImages(true);
    try {
      const results = await searchPexelsImages(destination, pexelsPage);
      if (results.length === 0 && pexelsPage > 1) {
        toast.info('Non ci sono altre immagini. Il ciclo ricomincerà.');
        setPexelsPage(1);
        setImageResults([]);
      } else {
        setImageResults(results);
        setPexelsPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error(error);
      toast.error('Errore durante la ricerca delle immagini.');
    }
    setIsSearchingImages(false);
  };

  useEffect(() => {
    setPexelsPage(1);
    setImageResults([]);
    if (!initialTrip) {
      setSelectedImageUrl('');
    }
  }, [destination, initialTrip]);

  const handleAgeRangeChange = (value: string) => {
    setAgeRange(value);
    const [min, max] = value.split('-');
    setMinAge(min);
    setMaxAge(max);
  };

  return (
    <form action={action} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-semibold">
          1. Dai un titolo al tuo viaggio
        </Label>
        <Input
          name="title"
          id="title"
          defaultValue={initialTrip?.title}
          placeholder="Es: Avventura epica alla scoperta della Tailandia"
          required
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="destination" className="text-base font-semibold">
          2. Scegli la destinazione e la copertina
        </Label>
        <div className="flex items-center space-x-2">
          <Input
            name="destination"
            id="destination"
            placeholder="Es: Tailandia"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="h-11"
          />
          <Button
            type="button"
            onClick={handleImageSearch}
            disabled={!destination || isSearchingImages}
            className="h-11"
          >
            {isSearchingImages
              ? 'Cerco...'
              : imageResults.length > 0
                ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4" />
                      Altre
                    </>
                  )
                : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Cerca
                    </>
                  )}
          </Button>
        </div>
      </div>

      {imageResults.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {imageResults.map((img) => (
            <button
              type="button"
              key={img.id}
              onClick={() => setSelectedImageUrl(img.urls.regular)}
              className={`relative aspect-video rounded-md overflow-hidden transition-all ${
                selectedImageUrl === img.urls.regular
                  ? 'ring-4 ring-blue-500'
                  : 'ring-2 ring-transparent hover:ring-blue-400'
              }`}
            >
              <Image
                src={img.urls.small}
                alt={img.description}
                fill
                style={{ objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}

      <input type="hidden" name="image_url" value={selectedImageUrl} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-base font-semibold">3. Quando?</Label>
          <Input type="hidden" name="startDate" value={startDate?.toISOString() || ''} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal h-11">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP', { locale: it }) : <span>Data di inizio</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                disabled={{ before: new Date() }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="text-base font-semibold opacity-0 md:opacity-100">
            E quando si torna?
          </Label>
          <Input type="hidden" name="endDate" value={endDate?.toISOString() || ''} />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-11"
                disabled={!startDate}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP', { locale: it }) : <span>Data di fine</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                disabled={{ before: startDate || new Date() }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">4. Chi viene in viaggio?</Label>
        <input type="hidden" name="planningMode" value={planningMode} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPlanningMode('solo')}
            className={`rounded-xl border-2 p-4 text-left transition ${
              planningMode === 'solo'
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-primary/40'
            }`}
          >
            <span className="text-lg">🧳</span>
            <p className="font-medium mt-2">Solo io (per ora)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pianifica in pace — altri potranno unirsi dopo.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setPlanningMode('group')}
            className={`rounded-xl border-2 p-4 text-left transition ${
              planningMode === 'group'
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-primary/40'
            }`}
          >
            <span className="text-lg">🎉</span>
            <p className="font-medium mt-2">Con gli amici</p>
            <p className="text-xs text-muted-foreground mt-1">
              Invita chi è svogliato: entra in modalità relax.
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className="text-base font-semibold">5. Dettagli gruppo</Label>
          <Input type="hidden" name="minAge" value={minAge} />
          <Input type="hidden" name="maxAge" value={maxAge} />
          <Select value={ageRange} onValueChange={handleAgeRangeChange} required>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Fascia d'età..." />
            </SelectTrigger>
            <SelectContent>
              {AGE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="opacity-0 md:opacity-100">Minimo</Label>
          <Input
            name="minParticipants"
            type="number"
            placeholder="Min. Partecipanti"
            defaultValue={initialTrip?.minParticipants ?? (planningMode === 'solo' ? 1 : 2)}
            key={`min-${planningMode}`}
            required
            min="1"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label className="opacity-0 md:opacity-100">Massimo</Label>
          <Input
            name="maxParticipants"
            type="number"
            placeholder="Max. Partecipanti"
            defaultValue={initialTrip?.maxParticipants ?? (planningMode === 'solo' ? 4 : 8)}
            key={`max-${planningMode}`}
            required
            min="1"
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-semibold">
          6. Descrivi l&apos;itinerario
        </Label>
        <Textarea
          name="description"
          id="description"
          defaultValue={initialTrip?.description}
          placeholder="Descrivi giorno per giorno le attività principali..."
          rows={5}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price" className="text-base font-semibold">
          7. Prezzo Stimato a Persona (€)
        </Label>
        <FlightPriceEstimate
          destination={destination}
          startDate={startDate}
          endDate={endDate}
          onSuggestPrice={(price) => {
            setSuggestedPrice(price);
            toast.success(`Prezzo volo indicativo applicato: ${price}€`);
          }}
        />
        <Input
          name="price"
          id="price"
          type="number"
          key={suggestedPrice ?? initialTrip?.price ?? 'empty'}
          defaultValue={suggestedPrice ?? initialTrip?.price}
          placeholder="Es: 1500 (puoi usare la stima volo sopra)"
          required
          min="1"
        />
        <p className="text-xs text-muted-foreground">
          La stima copre il volo da cache API. Aggiungi manualmente hotel, attività e margine
          organizzativo al prezzo finale a persona.
        </p>
      </div>

      <div className="pt-6">
        <Button type="submit" className="w-full text-lg h-12">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}