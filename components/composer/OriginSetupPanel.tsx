'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buildCrewOrigin, buildOrganizerOrigin } from '@/lib/composer/origins';
import { resolveOriginIata } from '@/lib/travel/origin-iata';
import type { ComposerDraft, ComposerOrigin } from '@/types/composer';
import type { PlaceResult } from '@/lib/places/types';
import { Loader2, MapPin, Plane, Plus, User, Users, X } from 'lucide-react';

type OriginSetupPanelProps = {
  draft: ComposerDraft;
  profileCity?: string | null;
  profileCountry?: string | null;
  onChange: (patch: Partial<ComposerDraft>) => void;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function IataBadge({ city, country }: { city: string; country?: string }) {
  const iata = resolveOriginIata(city, country);
  if (!iata) {
    return (
      <span className="text-[10px] text-amber-300/80">
        Aeroporto non riconosciuto — useremo hub predefinito
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 border border-sky-400/25 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
      <Plane className="h-3 w-3" />
      Aeroporto vicino: {iata}
    </span>
  );
}

function CityAutocomplete({
  placeholder,
  onSelect,
  initialValue = '',
}: {
  placeholder: string;
  onSelect: (city: string, country?: string) => void;
  initialValue?: string;
}) {
  const [query, setQuery] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPlaces = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(res.ok ? (data.results ?? []).slice(0, 6) : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlaces(debounced);
  }, [debounced, fetchPlaces]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (place: PlaceResult) => {
    const city = place.label.split(',')[0]?.trim() || place.label;
    setQuery(city);
    setFocused(false);
    onSelect(city, place.country);
  };

  const confirmManual = () => {
    const city = query.trim();
    if (city.length < 2) return;
    setFocused(false);
    onSelect(city);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          className="h-10 pl-9 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              confirmManual();
            }
          }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-white/30" />
        )}
      </div>

      <AnimatePresence>
        {focused && (results.length > 0 || query.trim().length >= 2) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-slate-950/95 backdrop-blur-xl shadow-xl overflow-hidden"
          >
            {results.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => pick(place)}
                className="w-full px-3 py-2.5 text-left hover:bg-white/[0.06] transition-colors"
              >
                <p className="text-sm text-white truncate">{place.label}</p>
                {place.subtitle && (
                  <p className="text-[10px] text-white/40 truncate">{place.subtitle}</p>
                )}
              </button>
            ))}
            {query.trim().length >= 2 && (
              <button
                type="button"
                onClick={confirmManual}
                className="w-full px-3 py-2 text-left text-xs text-accent hover:bg-white/[0.04] border-t border-white/5"
              >
                Usa &quot;{query.trim()}&quot;
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OriginCard({
  origin,
  icon: Icon,
  subtitle,
  onRemove,
}: {
  origin: ComposerOrigin;
  icon: typeof User;
  subtitle: string;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15">
        <Icon className="h-4 w-4 text-sky-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{origin.city}</p>
        <p className="text-[10px] text-white/40">{subtitle}</p>
      </div>
      <span className="shrink-0 rounded-lg bg-sky-600/30 px-2 py-1 text-xs font-bold text-sky-100 tabular-nums">
        {origin.iata}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/10"
          aria-label="Rimuovi"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function OriginSetupPanel({
  draft,
  profileCity,
  profileCountry,
  onChange,
}: OriginSetupPanelProps) {
  const [addingCrew, setAddingCrew] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || draft.organizerOrigin || !profileCity?.trim()) return;
    initialized.current = true;
    onChange({ organizerOrigin: buildOrganizerOrigin(profileCity, profileCountry ?? undefined) });
  }, [draft.organizerOrigin, profileCity, profileCountry, onChange]);

  const setOrganizer = (city: string, country?: string) => {
    onChange({ organizerOrigin: buildOrganizerOrigin(city, country) });
  };

  const addCrew = (city: string, country?: string) => {
    const origin = buildCrewOrigin(city, country);
    const existing = draft.crewOrigins ?? [];
    const duplicate = existing.some(
      (o) => o.city.toLowerCase() === origin.city.toLowerCase() && o.iata === origin.iata
    );
    if (duplicate) return;
    onChange({ crewOrigins: [...existing, origin] });
    setAddingCrew(false);
  };

  const removeCrew = (id: string) => {
    onChange({ crewOrigins: (draft.crewOrigins ?? []).filter((o) => o.id !== id) });
  };

  const isGroup = draft.planningMode === 'group';

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <User className="h-3 w-3" />
          Da dove parti tu?
        </Label>
        <p className="text-[10px] text-white/35 leading-relaxed">
          Cerchiamo l&apos;aeroporto più vicino per voli e transfer
        </p>
      </div>

      {draft.organizerOrigin ? (
        <OriginCard
          origin={draft.organizerOrigin}
          icon={User}
          subtitle="Tu — creatore"
          onRemove={() => onChange({ organizerOrigin: undefined })}
        />
      ) : (
        <CityAutocomplete
          placeholder="Es. Monte San Giusto, Milano..."
          onSelect={setOrganizer}
          initialValue={profileCity ?? ''}
        />
      )}

      {!draft.organizerOrigin && profileCity && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-accent hover:text-accent"
          onClick={() => setOrganizer(profileCity, profileCountry ?? undefined)}
        >
          Usa città profilo: {profileCity}
        </Button>
      )}

      {isGroup && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <Label className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            Amici da altre città
          </Label>
          <p className="text-[10px] text-white/35">
            Ogni amico avrà la ricerca volo dal proprio aeroporto vicino
          </p>

          {(draft.crewOrigins ?? []).map((origin) => (
            <OriginCard
              key={origin.id}
              origin={origin}
              icon={Users}
              subtitle="Amico / crew"
              onRemove={() => removeCrew(origin.id)}
            />
          ))}

          {addingCrew ? (
            <CityAutocomplete
              placeholder="Città dell'amico..."
              onSelect={addCrew}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-9 rounded-xl border-white/10 text-white/70 hover:bg-white/[0.06]"
              onClick={() => setAddingCrew(true)}
              disabled={(draft.crewOrigins?.length ?? 0) >= 6}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Aggiungi città amico
            </Button>
          )}
        </div>
      )}

      {draft.organizerOrigin && (
        <IataBadge
          city={draft.organizerOrigin.city}
          country={profileCountry ?? undefined}
        />
      )}
    </div>
  );
}