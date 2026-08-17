'use client';

import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BLOCK_META, getBlockDisplayPrice, getBlockDisplayTitle } from '@/lib/composer/blocks';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { estimateTripBudget, formatComposerDayLabel } from '@/lib/composer/days';
import { formatCreatorCashback, formatParticipantCashback } from '@/lib/commerce/cashback';
import type { ComposerDraft } from '@/types/composer';
import { TripMap } from '@/components/maps/TripMap';
import { buildPinsFromDraft } from '@/lib/maps/pins';
import { validatePublishDraft } from '@/lib/composer/publish-validation';
import { TripCoverPicker } from '@/components/trips/TripCoverPicker';
import { SavedTripBookables } from '@/components/trips/SavedTripBookables';
import { picksFromDraft } from '@/lib/composer/bookable-picks';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  MapPin,
  Route,
  Send,
  Wallet,
} from 'lucide-react';

type ComposerReviewStepProps = {
  draft: ComposerDraft;
  publishing: boolean;
  onBack: () => void;
  onPublish: () => void;
  onChange?: (patch: Partial<ComposerDraft>) => void;
};

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-white/45">{label}</p>
        <p className="truncate text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

export function ComposerReviewStep({
  draft,
  publishing,
  onBack,
  onPublish,
  onChange,
}: ComposerReviewStepProps) {
  const budget = estimateTripBudget(draft.days);
  const blockCount = draft.days.reduce((n, d) => n + d.blocks.length, 0);
  const pins = buildPinsFromDraft(draft);
  const bookablePicks = picksFromDraft(draft);
  const publishIssues = validatePublishDraft(draft);
  const canPublish = publishIssues.length === 0;
  const formatShort = (iso: string) => {
    try {
      return format(parseISO(iso), 'd MMM yyyy', { locale: it });
    } catch {
      return iso;
    }
  };
  const dateLabel =
    draft.startDate && draft.endDate
      ? `${formatShort(draft.startDate)} – ${formatShort(draft.endDate)}`
      : `${draft.days.length} giorni`;

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0f1a]/95 backdrop-blur-xl">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                Ultimo passo · Pubblicazione
              </p>
              <h2 className="font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
                Controlla e pubblica
              </h2>
              <p className="max-w-xl text-sm text-white/90">
                Controlla itinerario e budget. Esce “In formazione”: la partenza è garantita al
                minimo posti. Cashback: tu {formatCreatorCashback()}, chi si unisce{' '}
                {formatParticipantCashback()}.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={onBack}
                disabled={publishing}
              >
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Modifica
              </Button>
              <Button
                type="button"
                size="sm"
                className="min-w-[168px] gap-1.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={onPublish}
                disabled={publishing || !canPublish}
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {publishing ? 'Pubblicazione…' : 'Pubblica in formazione'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto max-w-4xl flex-1 space-y-6 px-4 py-8 pb-28"
      >
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02]">
          <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 p-6 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pronto · stato “In formazione”
              </div>
              <div>
                <h3 className="font-display text-2xl font-semibold text-white md:text-3xl">
                  {draft.title || 'Il tuo viaggio'}
                </h3>
                <p className="mt-2 flex items-center gap-2 text-sm text-white/65">
                  <MapPin className="h-4 w-4 shrink-0 text-accent" />
                  {draft.destination || 'Destinazione da definire'}
                </p>
              </div>
            </div>
            {pins.length > 0 ? (
              <div className="relative min-h-[200px] border-t border-white/10 md:border-l md:border-t-0">
                <TripMap
                  destination={draft.destination}
                  destinationMeta={draft.destinationMeta}
                  pins={pins}
                  className="absolute inset-0 h-full w-full"
                  interactive={false}
                  showRoute={false}
                />
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatPill icon={CalendarDays} label="Date" value={dateLabel} />
          <StatPill icon={Route} label="Itinerario" value={`${draft.days.length} giorni`} />
          <StatPill icon={MapPin} label="Tappe" value={`${blockCount}`} />
          <StatPill icon={Wallet} label="Budget stimato" value={`~${budget}€ / persona`} />
        </div>

        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/65">
          Garanzia di partenza fino a {draft.minParticipants ?? 4} posti. Servizi (voli, hotel,
          attrazioni) prenotabili solo a gruppo formato.
        </p>

        {onChange ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <TripCoverPicker
            destination={draft.destination}
            value={draft.imageUrl}
            onChange={(imageUrl) => onChange({ imageUrl })}
          />
        </section>
        ) : null}

        {publishIssues.length > 0 && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              Completa questi punti prima di pubblicare
            </div>
            <ul className="space-y-1.5 pl-6">
              {publishIssues.map((issue) => (
                <li key={issue.code} className="list-disc text-sm text-amber-100/85">
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {bookablePicks.length > 0 ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h4 className="font-display text-base font-semibold text-white">
              Cosa si prenota dopo
            </h4>
            <p className="mt-1 text-xs text-white/55">
              LiteAPI e Viator restano agganciati. Chi si unisce prenota questi, senza altre ricerche.
              I must visit restano sulla mappa.
            </p>
            <div className="mt-4">
              <SavedTripBookables
                picks={bookablePicks}
                startDate={draft.startDate}
                endDate={draft.endDate}
                variant="dark"
                allowCheckout={false}
              />
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h4 className="font-display text-base font-semibold text-white">Anteprima itinerario</h4>
              <p className="text-xs text-white/45">Come lo vedranno gli altri viaggiatori</p>
            </div>
          </div>
          <div className="divide-y divide-white/8">
            {draft.days.map((day) => (
              <div key={day.dayIndex} className="px-5 py-5">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <p className="font-display text-lg font-semibold text-white">{day.title}</p>
                  <p className="shrink-0 text-xs tabular-nums text-white/45">
                    {formatComposerDayLabel(day.date, day.dayIndex)}
                  </p>
                </div>
                {day.blocks.length === 0 ? (
                  <p className="text-sm italic text-white/35">Nessuna tappa in questo giorno</p>
                ) : (
                  <ul className="space-y-2">
                    {day.blocks.map((block) => {
                      const meta = BLOCK_META[block.type];
                      const price = getBlockDisplayPrice(block);
                      return (
                        <li
                          key={block.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3.5 py-2.5"
                        >
                          <span className="min-w-0 truncate text-sm text-white/90">
                            <span className="mr-2 opacity-80">{meta.emoji}</span>
                            {getBlockDisplayTitle(block)}
                          </span>
                          <span className="shrink-0 text-sm font-medium tabular-nums text-white/60">
                            {price != null ? `${price}€` : '—'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      </motion.div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0a0f1a]/92 backdrop-blur-xl sm:hidden">
        <div className="flex gap-2 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full"
            onClick={onBack}
            disabled={publishing}
          >
            Modifica
          </Button>
          <Button
            type="button"
            className="flex-[1.4] gap-1.5 rounded-full bg-accent text-accent-foreground"
            onClick={onPublish}
            disabled={publishing || !canPublish}
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {publishing ? 'Pubblicazione…' : 'Pubblica in formazione'}
          </Button>
        </div>
      </div>
    </div>
  );
}
