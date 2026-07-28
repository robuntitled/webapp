'use client';

import { FlightDateField } from '@/components/travel/FlightDateField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AffiliateSortKey = 'default' | 'price_asc' | 'price_desc' | 'rating';
export type AffiliateProviderFilter = 'all' | 'viator' | 'getyourguide';

export type PrenotaAffiliateSearchBarProps = {
  city: string;
  query: string;
  startDate: string;
  endDate: string;
  onCityChange: (v: string) => void;
  onQueryChange: (v: string) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onSearch: () => void;
  loading: boolean;
  queryPlaceholder: string;
  /** Filtri sotto la barra (stessi su entrambe le pagine) */
  providerFilter: AffiliateProviderFilter;
  onProviderFilterChange: (v: AffiliateProviderFilter) => void;
  minRating: number;
  onMinRatingChange: (v: number) => void;
  sort: AffiliateSortKey;
  onSortChange: (v: AffiliateSortKey) => void;
  showFilters?: boolean;
};

export function PrenotaAffiliateSearchBar({
  city,
  query,
  startDate,
  endDate,
  onCityChange,
  onQueryChange,
  onStartDateChange,
  onEndDateChange,
  onSearch,
  loading,
  queryPlaceholder,
  providerFilter,
  onProviderFilterChange,
  minRating,
  onMinRatingChange,
  sort,
  onSortChange,
  showFilters = true,
}: PrenotaAffiliateSearchBarProps) {
  return (
    <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-[oklch(0.22_0.05_220)] via-primary to-[oklch(0.5_0.1_200)] p-1 shadow-xl shadow-primary/15">
      <div className="space-y-3 rounded-[1.35rem] bg-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.1fr_auto]">
          <label className="space-y-1.5 text-sm">
            <Label>Città</Label>
            <Input
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              placeholder="Città o destinazione…"
              className="h-11 rounded-xl"
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <Label>Cerca (opzionale)</Label>
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={queryPlaceholder}
              className="h-11 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
            />
          </label>
          <FlightDateField
            tripType="activity"
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
          />
          <div className="flex items-end">
            <Button
              type="button"
              className="h-11 w-full rounded-xl sm:w-auto"
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
          <div className="flex flex-col gap-3 border-t border-border/50 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div
              className="inline-flex rounded-xl border border-border/70 bg-muted/40 p-0.5"
              role="tablist"
              aria-label="Provider"
            >
              {(
                [
                  ['all', 'Tutti'],
                  ['viator', 'Viator'],
                  ['getyourguide', 'GetYourGuide'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={providerFilter === key}
                  onClick={() => onProviderFilterChange(key)}
                  className={cn(
                    'rounded-[0.65rem] px-3 py-1.5 text-xs font-semibold transition',
                    providerFilter === key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Min. stelle
                <select
                  value={minRating}
                  onChange={(e) => onMinRatingChange(Number(e.target.value))}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground"
                >
                  <option value={0}>Tutte</option>
                  <option value={3}>3+</option>
                  <option value={4}>4+</option>
                  <option value={4.5}>4.5+</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Ordina
                <select
                  value={sort}
                  onChange={(e) => onSortChange(e.target.value as AffiliateSortKey)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground"
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
