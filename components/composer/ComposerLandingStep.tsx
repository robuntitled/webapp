'use client';

import { useRef, useState } from 'react';
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
import { generateTripTitle, TRIP_TITLE_MAX_LENGTH } from '@/lib/composer/title-generator';
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
};

export function ComposerLandingStep({ draft, onChange, onStart }: ComposerLandingStepProps) {
  const [micro, setMicro] = useState(1);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const titleTouched = useRef(false);

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

  const detectOrigin = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalizzazione non supportata');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=it`
          );
          const data = (await res.json()) as {
            address?: { city?: string; town?: string; village?: string; country?: string };
            display_name?: string;
          };
          const city =
            data.address?.city ?? data.address?.town ?? data.address?.village ?? 'La tua città';
          const label = data.display_name?.split(',')[0] ?? city;
          onChange({
            organizerOrigin: {
              id: `geo-${Date.now()}`,
              label,
              city,
              iata: '',
              role: 'organizer',
            },
          });
          toast.success(`Partenza da ${label}`);
        } catch {
          toast.error('Impossibile risolvere la posizione');
        }
        setGeoLoading(false);
      },
      () => {
        toast.error('Permesso posizione negato');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
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
                      <span className="truncate">{draft.organizerOrigin.label}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-white/45 text-center">
                      Attiva GPS o inserisci manualmente la città di partenza
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-xl composer-field text-white"
                      onClick={detectOrigin}
                      disabled={geoLoading}
                    >
                      {geoLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Navigation className="mr-2 h-4 w-4 text-accent" />
                      )}
                      Usa la mia posizione
                    </Button>
                    <Input
                      placeholder="Es. Roma"
                      className="flex-1 h-11 rounded-xl composer-field text-white"
                      defaultValue={draft.organizerOrigin?.city ?? ''}
                      onBlur={(e) => {
                        const city = e.target.value.trim();
                        if (!city) return;
                        onChange({
                          organizerOrigin: {
                            id: `manual-${city}`,
                            label: city,
                            city,
                            iata: '',
                            role: 'organizer',
                          },
                        });
                      }}
                    />
                  </div>
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
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white/80">Titolo del viaggio</p>
                  <span className="text-xs text-white/40 tabular-nums">
                    {draft.title.length}/{TRIP_TITLE_MAX_LENGTH}
                  </span>
                </div>
                <Input
                  className="h-14 rounded-2xl composer-field text-white text-lg"
                  value={draft.title}
                  maxLength={TRIP_TITLE_MAX_LENGTH}
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