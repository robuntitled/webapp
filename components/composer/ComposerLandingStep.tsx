'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarIcon,
  Loader2,
  MapPin,
  Navigation,
  Users,
  User,
} from 'lucide-react';
import { DestinationSearch } from '@/components/composer/DestinationSearch';
import { PlannerQuickSetupSheet } from '@/components/composer/PlannerQuickSetupSheet';
import { ComposerWizardHeader } from '@/components/composer/ComposerWizardHeader';
import { findDestination } from '@/lib/composer/destinations';
import { syncDestinationFields, getDraftDestinations } from '@/lib/composer/draft-destinations';
import { buildOrganizerOrigin } from '@/lib/composer/origins';
import { generateTripTitle } from '@/lib/composer/title-generator';
import type { ComposerDraft, DestinationMeta } from '@/types/composer';
import type { PlannerProfile } from '@/types/planner';
import { toast } from 'sonner';

const MICRO_STEPS = [
  { id: 1, label: 'Destinazione' },
  { id: 2, label: 'Date' },
  { id: 3, label: 'Viaggio' },
] as const;

type ComposerLandingStepProps = {
  draft: ComposerDraft;
  onChange: (patch: Partial<ComposerDraft>) => void;
  onStart: () => void;
  profileCity?: string | null;
  profileCountry?: string | null;
};

function geoPosition(
  options: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function ComposerLandingStep({
  draft,
  onChange,
  onStart,
  profileCity,
  profileCountry,
}: ComposerLandingStepProps) {
  const [micro, setMicro] = useState(1);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [originCityInput, setOriginCityInput] = useState(draft.organizerOrigin?.city ?? '');
  const titleTouched = useRef(false);
  const profileOriginApplied = useRef(false);

  useEffect(() => {
    setOriginCityInput(draft.organizerOrigin?.city ?? '');
  }, [draft.organizerOrigin?.city]);

  // Prefill da profilo se manca origin
  useEffect(() => {
    if (profileOriginApplied.current || draft.organizerOrigin || !profileCity?.trim()) return;
    profileOriginApplied.current = true;
    const origin = buildOrganizerOrigin(profileCity, profileCountry ?? undefined);
    onChange({ organizerOrigin: origin });
    setOriginCityInput(origin.city);
  }, [draft.organizerOrigin, profileCity, profileCountry, onChange]);

  const applyOriginCity = (city: string, country?: string) => {
    const trimmed = city.trim();
    if (!trimmed) return;
    const origin = buildOrganizerOrigin(trimmed, country);
    onChange({ organizerOrigin: origin });
    setOriginCityInput(origin.city);
  };

  const defaultStart = draft.startDate ? new Date(draft.startDate) : addDays(new Date(), 14);
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStart);
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    if (draft.endDate) return new Date(draft.endDate);
    return addDays(defaultStart, 7);
  });

  const selectedDestinations = getDraftDestinations(draft);
  const featured = findDestination(draft.destination);
  const heroGradient = featured?.gradient ?? 'from-primary/60 via-accent/40 to-teal-400/30';

  const handleDestinationsChange = (destinations: DestinationMeta[]) => {
    const labels = destinations.map((d) => d.label);
    const synced = syncDestinationFields(
      destinations,
      titleTouched.current ? draft.title : ''
    );
    if (destinations.length > 0 && !titleTouched.current) {
      synced.title = generateTripTitle(labels, labels.join('-'));
    }
    onChange(synced);
  };

  const canNext =
    micro === 1
      ? selectedDestinations.length > 0
      : micro === 2
        ? Boolean(startDate && endDate && endDate >= startDate)
        : Boolean(draft.title.trim());

  const goNext = () => {
    if (micro === 2 && startDate && endDate) {
      onChange({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });
    }
    if (micro < 3) setMicro((m) => m + 1);
    else onStart();
  };

  const applyCoords = async (latitude: number, longitude: number, source: 'gps' | 'rete') => {
    const res = await fetch(
      `/api/places/reverse?lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`
    );
    const data = (await res.json()) as {
      place?: { label: string; subtitle?: string; country?: string };
      error?: string;
    };
    if (!res.ok || !data.place) {
      throw new Error(data.error ?? 'Impossibile risolvere la posizione');
    }
    const origin = buildOrganizerOrigin(data.place.label, data.place.country);
    onChange({ organizerOrigin: origin });
    setOriginCityInput(origin.city);
    toast.success(
      source === 'gps' ? `Partenza da ${origin.city}` : `Partenza stimata: ${origin.city}`
    );
  };

  const fallbackNetworkOrigin = async (): Promise<boolean> => {
    const res = await fetch('/api/geo/approx');
    if (!res.ok) return false;
    const data = (await res.json()) as {
      city?: string | null;
      country?: string | null;
      lat?: number | null;
      lng?: number | null;
    };

    if (data.lat != null && data.lng != null) {
      try {
        await applyCoords(data.lat, data.lng, 'rete');
        return true;
      } catch {
        // prova con il nome città dell’header
      }
    }

    if (data.city?.trim()) {
      applyOriginCity(data.city, data.country ?? undefined);
      toast.success(`Partenza stimata: ${data.city.trim()}`);
      return true;
    }
    return false;
  };

  const detectOrigin = async () => {
    setGeoLoading(true);
    try {
      if (typeof window !== 'undefined' && window.isSecureContext && navigator.geolocation) {
        try {
          const status = await navigator.permissions?.query?.({ name: 'geolocation' });
          if (status?.state !== 'denied') {
            try {
              const pos = await geoPosition({
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 600_000,
              });
              await applyCoords(pos.coords.latitude, pos.coords.longitude, 'gps');
              return;
            } catch (err) {
              const geoErr = err as GeolocationPositionError;
              if (geoErr?.code === 1) {
                // permesso negato → prova rete, poi messaggio
              } else {
                // timeout / unavailable → rete
              }
            }
          }
        } catch {
          // permissions API assente
        }
      }

      const ok = await fallbackNetworkOrigin();
      if (ok) return;

      toast.error('GPS non disponibile. Scrivi la città nel campo qui sotto (es. Roma).', {
        duration: 7000,
      });
    } catch {
      toast.error('GPS non disponibile. Scrivi la città nel campo qui sotto (es. Roma).', {
        duration: 7000,
      });
    } finally {
      setGeoLoading(false);
    }
  };

  const microMeta = MICRO_STEPS[micro - 1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto pb-24"
    >
      <ComposerWizardHeader
        step="landing"
        microStep={micro}
        microTotal={3}
        microLabel={microMeta.label}
        title={
          micro === 1
            ? 'Dove andiamo?'
            : micro === 2
              ? 'Quando partite?'
              : 'Come lo chiamiamo?'
        }
        subtitle={
          micro === 1
            ? 'Scegli una o più mete — i suggerimenti seguono le tue preferenze.'
            : micro === 2
              ? 'Date e punto di partenza del viaggio.'
              : 'Titolo e modalità. Voli e hotel li aggiungi dopo.'
        }
      />

      {selectedDestinations.length > 0 && micro > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="composer-destination-pill mb-6 flex items-center gap-3 px-4 py-3"
        >
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${heroGradient} shrink-0`} />
          <div className="min-w-0">
            <p className="text-xs text-white/50 uppercase tracking-wider">Mete</p>
            <p className="font-semibold text-white truncate">{draft.destination}</p>
          </div>
        </motion.div>
      )}

      <div className="composer-panel rounded-3xl p-8 md:p-10">
        <AnimatePresence mode="wait">
          {micro === 1 && (
            <motion.div
              key="m1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-6"
            >
              <DestinationSearch
                selectedDestinations={selectedDestinations}
                plannerProfile={draft.plannerProfile}
                onDestinationsChange={handleDestinationsChange}
                onPersonalize={() => setPlannerOpen(true)}
              />
            </motion.div>
          )}

          {micro === 2 && (
            <motion.div
              key="m2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-8"
            >
              <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white/80 text-center">Partenza</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-14 justify-center rounded-2xl composer-field text-white text-base"
                      >
                        <CalendarIcon className="mr-2 h-5 w-5 text-accent" />
                        {startDate ? format(startDate, 'd MMM yyyy', { locale: it }) : 'Scegli'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 rounded-xl" align="center">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          setStartDate(d);
                          if (d) {
                            const ret = addDays(d, 7);
                            setEndDate(ret);
                            onChange({
                              startDate: format(d, 'yyyy-MM-dd'),
                              endDate: format(ret, 'yyyy-MM-dd'),
                            });
                          }
                        }}
                        disabled={{ before: new Date() }}
                        classNames={{ today: 'rounded-md text-foreground' }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white/80 text-center">Ritorno</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-14 justify-center rounded-2xl composer-field text-white text-base"
                        disabled={!startDate}
                      >
                        <CalendarIcon className="mr-2 h-5 w-5 text-accent" />
                        {endDate ? format(endDate, 'd MMM yyyy', { locale: it }) : 'Scegli'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 rounded-xl" align="center">
                      <Calendar
                        key={startDate?.toISOString() ?? 'no-start'}
                        mode="single"
                        selected={endDate}
                        defaultMonth={startDate}
                        onSelect={(d) => {
                          setEndDate(d);
                          if (d) onChange({ endDate: format(d, 'yyyy-MM-dd') });
                        }}
                        disabled={{ before: startDate || new Date() }}
                        classNames={{ today: 'rounded-md text-foreground' }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-sm font-medium text-white/80 text-center">Da dove parti?</p>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
                  {draft.organizerOrigin ? (
                    <div className="flex items-center gap-2 text-sm text-white">
                      <MapPin className="h-4 w-4 text-accent shrink-0" />
                      <span className="truncate">
                        {draft.organizerOrigin.city}
                        {draft.organizerOrigin.iata
                          ? ` · ${draft.organizerOrigin.iata}`
                          : ''}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-white/45 text-center">
                      Digita la città e premi Invio, oppure usa la posizione
                    </p>
                  )}
                  <Input
                    placeholder="Es. Roma, Milano, Napoli…"
                    className="h-11 rounded-xl composer-field text-white"
                    value={originCityInput}
                    onChange={(e) => setOriginCityInput(e.target.value)}
                    onBlur={() => applyOriginCity(originCityInput)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyOriginCity(originCityInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl composer-field text-white"
                    onClick={() => void detectOrigin()}
                    disabled={geoLoading}
                  >
                    {geoLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="mr-2 h-4 w-4 text-accent" />
                    )}
                    Usa la mia posizione
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {micro === 3 && (
            <motion.div
              key="m3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-8"
            >
              <div className="space-y-3">
                <p className="text-sm font-medium text-white/80">Titolo del viaggio</p>
                <Input
                  className="h-14 rounded-2xl composer-field text-white text-lg"
                  value={draft.title}
                  onChange={(e) => {
                    titleTouched.current = true;
                    onChange({ title: e.target.value });
                  }}
                  placeholder="Es. Viaggio a Sicilia"
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-white/80">Chi parte?</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['solo', 'group'] as const).map((mode) => {
                    const Icon = mode === 'solo' ? User : Users;
                    const active = draft.planningMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          onChange({
                            planningMode: mode,
                            maxParticipants: mode === 'solo' ? 4 : 8,
                          })
                        }
                        className={`rounded-2xl border-2 p-5 text-left transition-all ${
                          active
                            ? 'border-accent bg-accent/15 text-white'
                            : 'border-white/15 text-white/70 hover:border-white/30'
                        }`}
                      >
                        <Icon className={`h-6 w-6 mb-2 ${active ? 'text-accent' : ''}`} />
                        <p className="font-semibold">{mode === 'solo' ? 'Solo' : 'Con amici'}</p>
                        <p className="text-xs text-white/50 mt-1">
                          {mode === 'solo'
                            ? 'Organizzi per te, aperto ad altri viaggiatori'
                            : 'Viaggio privato tra amici — invito via link'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-4 mt-10 pt-8 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full text-white/70 hover:text-white"
            disabled={micro === 1}
            onClick={() => setMicro((m) => Math.max(1, m - 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>

          <Button
            type="button"
            size="lg"
            className="rounded-full px-8 font-semibold shadow-lg shadow-accent/20"
            disabled={!canNext}
            onClick={goNext}
          >
            {micro === 3 ? (
              <>
                <BookOpen className="mr-2 h-5 w-5" />
                Inizia a comporre
              </>
            ) : (
              <>
                Avanti
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      <PlannerQuickSetupSheet
        open={plannerOpen}
        onOpenChange={setPlannerOpen}
        initialProfile={draft.plannerProfile}
        onSaved={(profile: PlannerProfile) => onChange({ plannerProfile: profile })}
      />
    </motion.div>
  );
}