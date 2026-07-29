'use client';

import { useEffect, useState } from 'react';
import { AirportPlaceInput } from '@/components/travel/AirportPlaceInput';
import { FlightDateField } from '@/components/travel/FlightDateField';
import { GuestsPicker } from '@/components/travel/GuestsPicker';
import { Button } from '@/components/ui/button';
import {
  airportsInCountry,
  resolvePlaceExact,
  type PlaceSuggestion,
} from '@/lib/travel/airport-catalog';
import { Loader2, Search } from 'lucide-react';

export type AffiliateSortKey = 'default' | 'price_asc' | 'price_desc' | 'rating';

export type PrenotaAffiliateSearchBarProps = {
  city: string;
  startDate: string;
  endDate: string;
  adults: number;
  children?: number;
  onCityChange: (v: string) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onAdultsChange: (v: number) => void;
  onChildrenChange?: (v: number) => void;
  onSearch: () => void;
  loading: boolean;
  minRating: number;
  onMinRatingChange: (v: number) => void;
  sort: AffiliateSortKey;
  onSortChange: (v: AffiliateSortKey) => void;
  showFilters?: boolean;
};

export function PrenotaAffiliateSearchBar({
  city,
  startDate,
  endDate,
  adults,
  children = 0,
  onCityChange,
  onStartDateChange,
  onEndDateChange,
  onAdultsChange,
  onChildrenChange,
  onSearch,
  loading,
  minRating,
  onMinRatingChange,
  sort,
  onSortChange,
  showFilters = true,
}: PrenotaAffiliateSearchBarProps) {
  const [cityPlace, setCityPlace] = useState<PlaceSuggestion | null>(() =>
    city ? resolvePlaceExact(city) : null
  );

  useEffect(() => {
    setCityPlace(city ? resolvePlaceExact(city) : null);
  }, [city]);

  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-[oklch(0.22_0.05_220)] via-primary to-[oklch(0.5_0.1_200)] p-px shadow-lg shadow-primary/10">
      <div className="rounded-[0.95rem] bg-card px-3 py-3 sm:px-3.5 sm:py-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_auto] lg:items-end">
          <AirportPlaceInput
            label="Città"
            value={city}
            selected={cityPlace}
            onValueChange={(v) => {
              onCityChange(v);
              setCityPlace(null);
            }}
            onClearSelection={() => setCityPlace(null)}
            onSelect={(place) => {
              setCityPlace(place);
              if (place.kind === 'country') {
                const hub = airportsInCountry(place.code)[0]?.label;
                onCityChange(hub || place.label);
              } else {
                onCityChange(place.label);
              }
            }}
            placeholder="Città o paese…"
            kinds={['city', 'country']}
            showAirportCode={false}
          />
          <FlightDateField
            tripType="activity"
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />
          <GuestsPicker
            adults={adults}
            childrenCount={children}
            onAdultsChange={onAdultsChange}
            onChildrenChange={onChildrenChange ?? (() => {})}
            label="Persone"
          />
          <div className="flex items-end">
            <Button
              type="button"
              className="h-12 w-full rounded-xl px-5 font-semibold lg:w-auto"
              onClick={onSearch}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Cerca
            </Button>
          </div>
        </div>

        {showFilters ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/40 pt-2.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Partner: <span className="text-foreground">Viator</span>
            </p>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                Stelle
                <select
                  value={minRating}
                  onChange={(e) => onMinRatingChange(Number(e.target.value))}
                  className="h-7 rounded-md border border-border bg-background px-1.5 text-[11px] font-medium text-foreground"
                >
                  <option value={0}>Tutte</option>
                  <option value={3}>3+</option>
                  <option value={4}>4+</option>
                  <option value={4.5}>4.5+</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                Ordina
                <select
                  value={sort}
                  onChange={(e) => onSortChange(e.target.value as AffiliateSortKey)}
                  className="h-7 rounded-md border border-border bg-background px-1.5 text-[11px] font-medium text-foreground"
                >
                  <option value="default">Consigliate</option>
                  <option value="price_asc">Prezzo ↑</option>
                  <option value="price_desc">Prezzo ↓</option>
                  <option value="rating">Valutazione</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
