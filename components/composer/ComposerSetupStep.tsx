'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowRight, Users, User } from 'lucide-react';
import { DestinationSearch } from '@/components/composer/DestinationSearch';
import { OriginSetupPanel } from '@/components/composer/OriginSetupPanel';
import { findDestination } from '@/lib/composer/destinations';
import type { ComposerDraft, DestinationMeta } from '@/types/composer';

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

  const canContinue = Boolean(
    draft.destination &&
      draft.title &&
      startDate &&
      endDate &&
      endDate >= startDate &&
      draft.organizerOrigin
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto"
    >
      <div className="text-center space-y-4 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-white/70"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Step 2 di 4 · Scegli la meta
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white tracking-tight"
        >
          Dove ti porta
          <br />
          <span className="text-gradient-composer">l&apos;avventura?</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-white/55 max-w-lg mx-auto text-base md:text-lg leading-relaxed"
        >
          Dal paesino di montagna alla capitale esotica — cerca qualsiasi luogo e
          componi il viaggio giorno per giorno.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-3 space-y-5"
        >
          <DestinationSearch
            selectedLabel={draft.destination}
            selectedMeta={draft.destinationMeta}
            onSelect={selectDestination}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div
            className={`composer-glass rounded-3xl overflow-hidden sticky top-24 transition-all duration-700 ${
              draft.destination ? 'opacity-100' : 'opacity-60'
            }`}
          >
            {draft.destination && (
              <div className={`h-28 bg-gradient-to-br ${heroGradient} relative`}>
                <div className="absolute inset-0 composer-map-dots opacity-40" />
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-white/60 text-xs uppercase tracking-widest">Destinazione</p>
                  <p className="font-display text-xl font-semibold text-white truncate">
                    {draft.destinationMeta?.label ?? draft.destination}
                  </p>
                </div>
              </div>
            )}

            <div className="p-6 space-y-5">
              {!draft.destination ? (
                <div className="py-8 text-center space-y-3">
                  <div className="text-4xl opacity-40">🌍</div>
                  <p className="text-sm text-white/45 leading-relaxed">
                    Seleziona una meta per configurare date, crew e titolo del viaggio
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs uppercase tracking-wider">
                      Nome del viaggio
                    </Label>
                    <Input
                      className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-accent/40"
                      value={draft.title}
                      onChange={(e) => onChange({ title: e.target.value })}
                      placeholder="Es. Road trip in Sicilia"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-white/70 text-xs uppercase tracking-wider">
                        Partenza
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full h-11 justify-start rounded-xl bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] hover:text-white"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-accent" />
                            <span className="truncate text-sm">
                              {startDate ? format(startDate, 'd MMM', { locale: it }) : 'Data'}
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
                            className="w-full h-11 justify-start rounded-xl bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] hover:text-white"
                            disabled={!startDate}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-accent" />
                            <span className="truncate text-sm">
                              {endDate ? format(endDate, 'd MMM', { locale: it }) : 'Data'}
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
                    <p className="text-center text-xs text-accent/80 font-medium">
                      {tripDays} {tripDays === 1 ? 'giorno' : 'giorni'} di avventura
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label className="text-white/70 text-xs uppercase tracking-wider">
                      Chi viene?
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
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
                            className={`rounded-xl border p-3 text-left transition-all ${
                              active
                                ? 'border-accent/60 bg-accent/10 shadow-lg shadow-accent/5'
                                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                            }`}
                          >
                            <Icon
                              className={`h-4 w-4 mb-2 ${active ? 'text-accent' : 'text-white/40'}`}
                            />
                            <p className="font-medium text-sm text-white">
                              {mode === 'solo' ? 'Solo (per ora)' : 'Con amici'}
                            </p>
                            <p className="text-[10px] text-white/40 mt-0.5">
                              {mode === 'solo' ? 'Max 4 posti' : 'Fino a 8'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <OriginSetupPanel
                    draft={draft}
                    profileCity={profileCity}
                    profileCountry={profileCountry}
                    onChange={onChange}
                  />

                  <Button
                    type="button"
                    size="lg"
                    className="w-full h-12 rounded-full text-base font-semibold shadow-lg shadow-accent/20 group"
                    disabled={!canContinue}
                    onClick={onContinue}
                  >
                    Inizia a comporre
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <p className="text-center text-xs text-white/30 mt-8">
        Ricerca mondiale powered by OpenStreetMap · migliaia di luoghi disponibili
      </p>
    </motion.div>
  );
}