'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Sparkles, Search } from 'lucide-react';
import { COMPOSER_DESTINATIONS, filterDestinations } from '@/lib/composer/destinations';
import type { ComposerDraft } from '@/types/composer';

type ComposerSetupStepProps = {
  draft: ComposerDraft;
  onChange: (patch: Partial<ComposerDraft>) => void;
  onContinue: () => void;
};

export function ComposerSetupStep({ draft, onChange, onContinue }: ComposerSetupStepProps) {
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(
    draft.startDate ? new Date(draft.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    draft.endDate ? new Date(draft.endDate) : undefined
  );

  const destinations = useMemo(() => filterDestinations(query), [query]);

  const selectDestination = (label: string) => {
    onChange({
      destination: label,
      title: draft.title || `Avventura a ${label}`,
    });
  };

  const canContinue = Boolean(
    draft.destination && draft.title && startDate && endDate && endDate >= startDate
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-4 py-1.5 text-sm text-accent font-medium">
          <Sparkles className="h-4 w-4" />
          Step 1 · Scegli la meta
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-white">
          Dove ti porta l&apos;avventura?
        </h2>
        <p className="text-white/65 max-w-xl mx-auto">
          Scegli una destinazione, poi comporrai il viaggio giorno per giorno — voli, hotel,
          attività e alternative.
        </p>
      </div>

      <div className="composer-glass rounded-3xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-12 pl-10 rounded-xl text-base"
            placeholder="Cerca meta, regione, vibe..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[280px] overflow-y-auto pr-1">
          {destinations.map((dest) => {
            const selected = draft.destination === dest.label;
            return (
              <button
                key={dest.id}
                type="button"
                onClick={() => selectDestination(dest.label)}
                className={`rounded-2xl border-2 p-4 text-left transition-all hover:scale-[1.02] ${
                  selected
                    ? 'border-accent bg-accent/10 shadow-lg shadow-accent/10'
                    : 'border-border/60 bg-card/80 hover:border-primary/30'
                }`}
              >
                <span className="text-2xl">{dest.emoji}</span>
                <p className="font-semibold mt-2 text-sm">{dest.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{dest.vibe}</p>
              </button>
            );
          })}
        </div>

        {draft.destination && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-5 pt-4 border-t"
          >
            <div className="space-y-2">
              <Label>Nome del viaggio</Label>
              <Input
                className="h-11 rounded-xl"
                value={draft.title}
                onChange={(e) => onChange({ title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Partenza</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-11 justify-start rounded-xl">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP', { locale: it }) : 'Scegli data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 rounded-xl">
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
                <Label>Ritorno</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-11 justify-start rounded-xl"
                      disabled={!startDate}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP', { locale: it }) : 'Scegli data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 rounded-xl">
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

            <div className="space-y-3">
              <Label>Chi viene?</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['solo', 'group'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      onChange({
                        planningMode: mode,
                        maxParticipants: mode === 'solo' ? 4 : 8,
                      })
                    }
                    className={`rounded-xl border-2 p-3 text-left ${
                      draft.planningMode === mode
                        ? 'border-primary bg-primary/5'
                        : 'border-muted'
                    }`}
                  >
                    <span className="text-lg">{mode === 'solo' ? '🧳' : '🎉'}</span>
                    <p className="font-medium text-sm mt-1">
                      {mode === 'solo' ? 'Solo (per ora)' : 'Con amici'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full h-12 rounded-full text-base"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Inizia a comporre giorno per giorno →
        </Button>
      </div>

      {!query && (
        <p className="text-center text-xs text-white/40">
          {COMPOSER_DESTINATIONS.length} mete pronte — o cerca la tua
        </p>
      )}
    </motion.div>
  );
}