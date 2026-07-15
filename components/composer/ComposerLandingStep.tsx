'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format, addDays, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BookOpen,
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Users,
  User,
} from 'lucide-react';
import { DestinationSearch } from '@/components/composer/DestinationSearch';
import { findDestination } from '@/lib/composer/destinations';
import type { ComposerDraft, DestinationMeta } from '@/types/composer';

type DateMode = 'calendar' | 'days';

type ComposerLandingStepProps = {
  draft: ComposerDraft;
  onChange: (patch: Partial<ComposerDraft>) => void;
  onStart: () => void;
};

export function ComposerLandingStep({ draft, onChange, onStart }: ComposerLandingStepProps) {
  const [dateMode, setDateMode] = useState<DateMode>(
    draft.startDate && draft.endDate ? 'calendar' : 'days'
  );
  const [dayCount, setDayCount] = useState(() => {
    if (draft.startDate && draft.endDate) {
      return differenceInDays(new Date(draft.endDate), new Date(draft.startDate)) + 1;
    }
    return 5;
  });
  const [startDate, setStartDate] = useState<Date | undefined>(
    draft.startDate ? new Date(draft.startDate) : addDays(new Date(), 14)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    draft.endDate ? new Date(draft.endDate) : undefined
  );
  const [showOptions, setShowOptions] = useState(false);

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

  const syncDayCountToDates = (count: number, anchor?: Date) => {
    const start = anchor ?? startDate ?? addDays(new Date(), 14);
    const end = addDays(start, Math.max(1, count) - 1);
    setStartDate(start);
    setEndDate(end);
    onChange({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    });
  };

  const tripDays =
    startDate && endDate ? differenceInDays(endDate, startDate) + 1 : dayCount;

  const canStart = Boolean(draft.destination && startDate && endDate && endDate >= startDate);

  const handleStart = () => {
    if (!canStart) return;
    if (dateMode === 'days') {
      syncDayCountToDates(dayCount);
    }
    onStart();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-xl mx-auto"
    >
      <div className="text-center space-y-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-white/70"
        >
          <BookOpen className="h-4 w-4 text-accent" />
          Apri il libro del viaggio
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight"
        >
          Dove andiamo?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/55 max-w-md mx-auto leading-relaxed"
        >
          Solo meta e giorni per iniziare. Voli, hotel e dettagli li aggiungi dopo, pagina per
          pagina.
        </motion.p>
      </div>

      <div className="composer-glass rounded-3xl p-6 md:p-8 space-y-6">
        <div className="space-y-3">
          <Label className="text-white/70 text-xs uppercase tracking-wider">Destinazione</Label>
          <DestinationSearch
            selectedLabel={draft.destination}
            selectedMeta={draft.destinationMeta}
            onSelect={selectDestination}
          />
        </div>

        {draft.destination && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`rounded-2xl overflow-hidden bg-gradient-to-br ${heroGradient} p-4`}
          >
            <p className="text-white/70 text-xs uppercase tracking-widest">La tua storia inizia a</p>
            <p className="font-display text-xl font-semibold text-white">
              {draft.destinationMeta?.label ?? draft.destination}
            </p>
          </motion.div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-white/70 text-xs uppercase tracking-wider">Durata</Label>
            <div className="flex rounded-full p-0.5 bg-white/[0.06] text-xs">
              <button
                type="button"
                onClick={() => setDateMode('days')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  dateMode === 'days' ? 'bg-white text-slate-900' : 'text-white/60'
                }`}
              >
                N° giorni
              </button>
              <button
                type="button"
                onClick={() => setDateMode('calendar')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  dateMode === 'calendar' ? 'bg-white text-slate-900' : 'text-white/60'
                }`}
              >
                Date precise
              </button>
            </div>
          </div>

          {dateMode === 'days' ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl border-white/10"
                  disabled={dayCount <= 1}
                  onClick={() => {
                    const next = Math.max(1, dayCount - 1);
                    setDayCount(next);
                    syncDayCountToDates(next);
                  }}
                >
                  −
                </Button>
                <span className="font-display text-3xl font-semibold text-white w-12 text-center tabular-nums">
                  {dayCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl border-white/10"
                  disabled={dayCount >= 30}
                  onClick={() => {
                    const next = Math.min(30, dayCount + 1);
                    setDayCount(next);
                    syncDayCountToDates(next);
                  }}
                >
                  +
                </Button>
              </div>
              <span className="text-sm text-white/50">
                {dayCount === 1 ? 'giorno' : 'giorni'}
                {startDate && (
                  <span className="block text-xs text-white/35 mt-0.5">
                    da {format(startDate, 'd MMM yyyy', { locale: it })}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-start rounded-xl bg-white/[0.04] border-white/10 text-white"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-accent" />
                    {startDate ? format(startDate, 'd MMM', { locale: it }) : 'Partenza'}
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
                          const end = addDays(d, dayCount - 1);
                          setEndDate(end);
                          onChange({ endDate: format(end, 'yyyy-MM-dd') });
                        }
                      }
                    }}
                    disabled={{ before: new Date() }}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-11 justify-start rounded-xl bg-white/[0.04] border-white/10 text-white"
                    disabled={!startDate}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-accent" />
                    {endDate ? format(endDate, 'd MMM', { locale: it }) : 'Ritorno'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 rounded-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => {
                      setEndDate(d);
                      if (d) {
                        onChange({ endDate: format(d, 'yyyy-MM-dd') });
                        if (startDate) {
                          setDayCount(differenceInDays(d, startDate) + 1);
                        }
                      }
                    }}
                    disabled={{ before: startDate || new Date() }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {tripDays > 0 && (
            <p className="text-center text-sm text-accent/90 font-medium">
              {tripDays} {tripDays === 1 ? 'pagina' : 'pagine'} nel tuo libro
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-white/70 text-xs uppercase tracking-wider">
            Budget indicativo (opzionale)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">€</span>
            <Input
              type="number"
              min={0}
              placeholder="Es. 800 totali"
              className="h-11 pl-8 rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
              value={draft.budgetHint ?? ''}
              onChange={(e) =>
                onChange({
                  budgetHint: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          className="flex items-center gap-2 text-xs text-white/45 hover:text-white/70 transition-colors"
        >
          {showOptions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Opzioni viaggio (gruppo, titolo)
        </button>

        {showOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 pt-2 border-t border-white/10"
          >
            <div className="space-y-2">
              <Label className="text-white/70 text-xs uppercase tracking-wider">Titolo</Label>
              <Input
                className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white"
                value={draft.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Es. Road trip in Sicilia"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
                    className={`rounded-xl border p-3 text-left text-sm transition-all ${
                      active
                        ? 'border-accent/50 bg-accent/10 text-white'
                        : 'border-white/10 text-white/60 hover:border-white/20'
                    }`}
                  >
                    <Icon className={`h-4 w-4 mb-1 ${active ? 'text-accent' : ''}`} />
                    {mode === 'solo' ? 'Solo' : 'Con amici'}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg shadow-accent/25"
          disabled={!canStart}
          onClick={handleStart}
        >
          <BookOpen className="mr-2 h-5 w-5" />
          Inizia a costruire il viaggio
        </Button>

        <p className="text-center text-xs text-white/40">
          <Link
            href="/dashboard/profilo"
            className="inline-flex items-center gap-1 text-accent/80 hover:text-accent"
          >
            <Sparkles className="h-3 w-3" />
            Personalizza suggerimenti AI
          </Link>
          <span className="text-white/25"> · bozza salvata automaticamente</span>
        </p>
      </div>
    </motion.div>
  );
}