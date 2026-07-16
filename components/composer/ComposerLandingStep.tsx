'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Sparkles,
  Users,
  User,
} from 'lucide-react';
import { DestinationSearch } from '@/components/composer/DestinationSearch';
import { ComposerWizardHeader } from '@/components/composer/ComposerWizardHeader';
import { findDestination } from '@/lib/composer/destinations';
import type { ComposerDraft, DestinationMeta } from '@/types/composer';

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
  const defaultStart = draft.startDate ? new Date(draft.startDate) : addDays(new Date(), 14);
  const [startDate, setStartDate] = useState<Date | undefined>(defaultStart);
  const [endDate, setEndDate] = useState<Date | undefined>(() => {
    if (draft.endDate) return new Date(draft.endDate);
    return addDays(defaultStart, 4);
  });

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
      title: draft.title || `Viaggio a ${meta.label}`,
    });
  };

  const canNext =
    micro === 1
      ? Boolean(draft.destination)
      : micro === 2
        ? Boolean(startDate && endDate && endDate >= startDate)
        : true;

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
            ? 'Un passo alla volta — la chat AI è sempre in basso a destra se hai dubbi.'
            : micro === 2
              ? 'Scegli data di partenza e ritorno.'
              : 'Titolo e compagnia di viaggio. Voli e hotel li aggiungi dopo.'
        }
      />

      {draft.destination && micro > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="composer-destination-pill mb-6 flex items-center gap-3 px-4 py-3"
        >
          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${heroGradient} shrink-0`} />
          <div className="min-w-0">
            <p className="text-xs text-white/50 uppercase tracking-wider">Destinazione</p>
            <p className="font-semibold text-white truncate">
              {draft.destinationMeta?.label ?? draft.destination}
            </p>
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
                selectedLabel={draft.destination}
                selectedMeta={draft.destinationMeta}
                onSelect={selectDestination}
              />
              {draft.destination && (
                <div className={`rounded-2xl bg-gradient-to-br ${heroGradient} p-6 text-center`}>
                  <p className="text-white/80 text-sm">Perfetto — iniziamo da</p>
                  <p className="font-display text-2xl font-semibold text-white mt-1">
                    {draft.destinationMeta?.label ?? draft.destination}
                  </p>
                </div>
              )}
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
                            onChange({ startDate: format(d, 'yyyy-MM-dd') });
                            if (!endDate || endDate < d) setEndDate(undefined);
                          }
                        }}
                        disabled={{ before: new Date() }}
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
                  onChange={(e) => onChange({ title: e.target.value })}
                  placeholder="Es. Road trip in Sicilia"
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
                          {mode === 'solo' ? 'Organizzi per te' : 'Fino a 8 partecipanti'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-white/80">Budget indicativo (opzionale)</p>
                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">
                    €
                  </span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Es. 800"
                    className="h-14 pl-10 rounded-2xl composer-field text-white text-lg"
                    value={draft.budgetHint ?? ''}
                    onChange={(e) =>
                      onChange({
                        budgetHint: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
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

      {micro === 1 && (
        <p className="text-center text-sm text-white/45 mt-6">
          <Link
            href="/dashboard/profilo"
            className="inline-flex items-center gap-1.5 text-accent hover:underline"
          >
            <Sparkles className="h-4 w-4" />
            Personalizza suggerimenti AI
          </Link>
        </p>
      )}
    </motion.div>
  );
}