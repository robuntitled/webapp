'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, ArrowRight, Users, User, Check } from 'lucide-react';
import { DestinationSearch } from '@/components/composer/DestinationSearch';
import { OriginSetupPanel } from '@/components/composer/OriginSetupPanel';
import { ComposerWizardHeader } from '@/components/composer/ComposerWizardHeader';
import { findDestination } from '@/lib/composer/destinations';
import type { ComposerDraft, DestinationMeta } from '@/types/composer';

const MICRO_STEPS = [
  { id: 1, label: 'Destinazione' },
  { id: 2, label: 'Date' },
  { id: 3, label: 'Gruppo' },
  { id: 4, label: 'Partenze' },
] as const;

type ComposerSetupStepProps = {
  draft: ComposerDraft;
  profileCity?: string | null;
  profileCountry?: string | null;
  onChange: (patch: Partial<ComposerDraft>) => void;
  onContinue: () => void;
};

export function ComposerSetupStep({
  draft,
  profileCity,
  profileCountry,
  onChange,
  onContinue,
}: ComposerSetupStepProps) {
  const [micro, setMicro] = useState(1);
  const [startDate, setStartDate] = useState<Date | undefined>(
    draft.startDate ? new Date(draft.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    draft.endDate ? new Date(draft.endDate) : undefined
  );

  const featured = findDestination(draft.destination);
  const heroGradient = featured?.gradient ?? 'from-primary/60 via-accent/40 to-teal-400/30';

  const selectDestination = (label: string, meta: DestinationMeta) => {
    if (!label) {
      onChange({ destination: '', destinationMeta: undefined, title: '' });
      return;
    }
    onChange({
      destination: label,
      destinationMeta: meta,
      title: draft.title || `Avventura a ${meta.label}`,
    });
  };

  const tripDays =
    startDate && endDate ? differenceInDays(endDate, startDate) + 1 : null;

  const canNext =
    micro === 1
      ? Boolean(draft.destination && draft.title.trim())
      : micro === 2
        ? Boolean(startDate && endDate && endDate >= startDate)
        : micro === 3
          ? true
          : Boolean(draft.organizerOrigin);

  const goNext = () => {
    if (micro < 4) setMicro((m) => m + 1);
    else onContinue();
  };

  const microMeta = MICRO_STEPS[micro - 1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto"
    >
      <ComposerWizardHeader
        step="setup"
        microStep={micro}
        microTotal={4}
        microLabel={microMeta.label}
        title={
          micro === 1
            ? 'Dove ti porta l\'avventura?'
            : micro === 2
              ? 'Quando parti?'
              : micro === 3
                ? 'Chi viene con te?'
                : 'Da dove partite?'
        }
        subtitle={
          micro === 1
            ? 'Cerca qualsiasi luogo — dal paesino di montagna alla capitale esotica.'
            : micro === 4
              ? 'Imposta la tua città di partenza e quelle degli altri partecipanti.'
              : undefined
        }
      />

      {draft.destination && micro > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`composer-glass rounded-2xl overflow-hidden mb-6`}
        >
          <div className={`h-16 bg-gradient-to-br ${heroGradient} relative`}>
            <div className="absolute inset-0 composer-map-dots opacity-40" />
            <div className="absolute bottom-2 left-4 right-4 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white/60 text-[10px] uppercase tracking-widest">Destinazione</p>
                <p className="font-display text-lg font-semibold text-white truncate">
                  {draft.destinationMeta?.label ?? draft.destination}
                </p>
              </div>
              {tripDays != null && tripDays > 0 && (
                <span className="text-xs text-white/80 font-medium shrink-0">
                  {tripDays} {tripDays === 1 ? 'giorno' : 'giorni'}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <div className="composer-glass rounded-3xl p-6 md:p-8">
        <AnimatePresence mode="wait">
          {micro === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-5"
            >
              <DestinationSearch
                selectedDestinations={
                  draft.destinationMeta ? [draft.destinationMeta] : []
                }
                plannerProfile={draft.plannerProfile}
                onDestinationsChange={(dests) => {
                  if (dests.length === 0) selectDestination('', { label: '', lat: 0, lng: 0 });
                  else selectDestination(dests.map((d) => d.label).join(' · '), dests[0]);
                }}
                onPersonalize={() => undefined}
              />

              {draft.destination && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 pt-2"
                >
                  <Label className="text-white/70 text-xs uppercase tracking-wider">
                    Nome del viaggio
                  </Label>
                  <Input
                    className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-accent/40"
                    value={draft.title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    placeholder="Es. Road trip in Sicilia"
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {micro === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70 text-xs uppercase tracking-wider">
                    Partenza
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-12 justify-start rounded-xl bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] hover:text-white"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-accent" />
                        <span className="truncate">
                          {startDate
                            ? format(startDate, 'd MMMM yyyy', { locale: it })
                            : 'Scegli data'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 rounded-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          setStartDate(d);
                          if (d) {
                            onChange({ startDate: format(d, 'yyyy-MM-dd') });
                            if (!endDate || endDate < d) {
                              const end = addDays(d, 6);
                              setEndDate(end);
                              onChange({ endDate: format(end, 'yyyy-MM-dd') });
                            }
                          }
                        }}
                        disabled={{ before: new Date() }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/70 text-xs uppercase tracking-wider">
                    Ritorno
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-12 justify-start rounded-xl bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] hover:text-white"
                        disabled={!startDate}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-accent" />
                        <span className="truncate">
                          {endDate
                            ? format(endDate, 'd MMMM yyyy', { locale: it })
                            : 'Scegli data'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 rounded-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => {
                          setEndDate(d);
                          if (d) onChange({ endDate: format(d, 'yyyy-MM-dd') });
                        }}
                        disabled={{ before: startDate || new Date() }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {tripDays != null && tripDays > 0 && (
                <p className="text-center text-sm text-accent/90 font-medium py-2">
                  {tripDays} {tripDays === 1 ? 'giorno' : 'giorni'} di avventura
                </p>
              )}
            </motion.div>
          )}

          {micro === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-4"
            >
              <p className="text-sm text-white/50 text-center">
                Puoi invitare amici dopo la pubblicazione
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['solo', 'group'] as const).map((mode) => {
                  const active = draft.planningMode === mode;
                  const Icon = mode === 'solo' ? User : Users;
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
                      className={`rounded-2xl border p-5 text-left transition-all ${
                        active
                          ? 'border-accent/60 bg-accent/10 shadow-lg shadow-accent/5'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 mb-3 ${active ? 'text-accent' : 'text-white/40'}`}
                      />
                      <p className="font-semibold text-base text-white">
                        {mode === 'solo' ? 'Solo (per ora)' : 'Con amici'}
                      </p>
                      <p className="text-xs text-white/45 mt-1">
                        {mode === 'solo'
                          ? 'Pianifica da solo, max 4 posti se inviti dopo'
                          : 'Gruppo fino a 8 persone'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {micro === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
            >
              <OriginSetupPanel
                draft={draft}
                profileCity={profileCity}
                profileCountry={profileCountry}
                onChange={onChange}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
            disabled={micro === 1}
            onClick={() => setMicro((m) => Math.max(1, m - 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>

          <Button
            type="button"
            size="lg"
            className="rounded-xl min-w-[160px] font-semibold shadow-lg shadow-accent/20"
            disabled={!canNext}
            onClick={goNext}
          >
            {micro === 4 ? (
              <>
                <Check className="mr-2 h-4 w-4" />
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

      <p className="text-center text-xs text-white/30 mt-6">
        Ricerca mondiale powered by OpenStreetMap
      </p>
    </motion.div>
  );
}