'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowLeft, ArrowRight, Loader2, MapPin, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { joinEditionAction, startPracticeAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import { PhotoChoiceCard } from '@/components/itineraries/PhotoChoiceCard';
import { findItineraryBySlug, templatesForDestination } from '@/lib/itineraries/catalog';
import { datesForDuration, formatItDate } from '@/lib/itineraries/dates';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import { cn } from '@/lib/utils';
import type { OfficialEditionCard, TravelMode } from '@/lib/itineraries/types';

const WHO_COVERS = {
  solo: 'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=900&q=80',
  friends:
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
  group: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=900&q=80',
} as const;

type Step = 'dest' | 'plan' | 'who' | 'when';

const STEPS: Step[] = ['dest', 'plan', 'who', 'when'];

const phaseMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
};

export function StartTripWizard({
  destinations,
  editions,
  initialSlug,
  initialDuration,
}: {
  destinations: { slug: string; name: string; vibe: string; emoji: string; allowedDurations: number[] }[];
  editions: OfficialEditionCard[];
  initialSlug?: string;
  initialDuration?: number;
}) {
  const startTemplate = initialSlug
    ? findItineraryBySlug(initialSlug, initialDuration)
    : undefined;
  const [step, setStep] = useState<Step>(startTemplate ? 'plan' : 'dest');
  const [slug, setSlug] = useState(startTemplate?.destination_slug ?? '');
  const [duration, setDuration] = useState(startTemplate?.duration_days ?? 0);
  const [mode, setMode] = useState<TravelMode | null>(null);
  const [date, setDate] = useState<Date>();
  const [editionId, setEditionId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { data: session } = useSession();
  const router = useRouter();

  const template = slug && duration ? findItineraryBySlug(slug, duration) : undefined;
  const idx = STEPS.indexOf(step);
  const range = date && template ? datesForDuration(format(date, 'yyyy-MM-dd'), template.duration_days) : null;
  const officialForTemplate = useMemo(
    () => editions.filter((e) => e.template_id === template?.template_id),
    [editions, template?.template_id]
  );

  const pickDuration = (nextSlug: string, days: number) => {
    setSlug(nextSlug);
    setDuration(days);
    setStep('plan');
  };

  const goBack = () => {
    const prev = STEPS[idx - 1];
    if (prev) setStep(prev);
  };

  const goNext = () => {
    if (step === 'plan') {
      setStep('who');
      return;
    }
    if (step === 'who') {
      if (!mode) {
        toast.error('Scegli come vuoi partire.');
        return;
      }
      if (mode === 'group') {
        const eds = editions.filter((e) => e.template_id === template?.template_id);
        if (eds.length === 1) {
          confirmWithEdition(eds[0].id);
          return;
        }
      }
      setStep('when');
    }
  };

  const confirmWithEdition = (id: string) => {
    if (!template) return;
    if (!session?.user) {
      toast.error('Accedi per confermare.');
      router.push(`/?callbackUrl=/itinerario/${template.destination_slug}?d=${template.duration_days}`);
      return;
    }
    startTransition(async () => {
      const result = await joinEditionAction(id);
      if (result?.error) toast.error(result.error);
    });
  };

  const confirm = () => {
    if (!template) return;
    if (!session?.user) {
      toast.error('Accedi per confermare.');
      router.push(`/?callbackUrl=/itinerario/${template.destination_slug}?d=${template.duration_days}`);
      return;
    }
    if (mode === 'group') {
      if (!editionId) {
        toast.error('Scegli una partenza ufficiale.');
        return;
      }
      confirmWithEdition(editionId);
      return;
    }
    if (!date) {
      toast.error('Scegli il giorno di partenza.');
      return;
    }
    startTransition(async () => {
      const result = await startPracticeAction({
        templateId: template.template_id,
        mode: mode === 'friends' ? 'friends' : 'solo',
        dateFrom: format(date, 'yyyy-MM-dd'),
      });
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <div className="composer-shell relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 pb-8 pt-10">
        <div className="mb-8 space-y-4 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#161d2b] px-4 py-1.5 text-sm text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Step {idx + 1} di {STEPS.length}
          </p>
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  i === idx ? 'w-10 bg-accent' : i < idx ? 'w-5 bg-accent/50' : 'w-5 bg-white/15'
                )}
              />
            ))}
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-5xl">
            {step === 'dest' && 'Scegli la nazione. Poi i giorni.'}
            {step === 'plan' && 'Questo è il piano.'}
            {step === 'who' && 'Come vuoi partire?'}
            {step === 'when' && (mode === 'group' ? 'Scegli la partenza' : 'Quando parti?')}
          </h1>
          <p className="mx-auto max-w-xl text-base text-white/85">
            {step === 'dest' && 'Tre durate. L’itinerario è già pronto.'}
            {step === 'plan' && 'Riferimento, non pacchetto. Avanti per date e compagni.'}
            {step === 'who' && 'Stesso piano. Cambiano solo date e con chi vai.'}
            {step === 'when' &&
              (mode === 'group'
                ? 'Date già fissate. Entri e vedi i voli.'
                : 'Scegli il giorno. Poi partono voli, hotel e attrazioni.')}
          </p>
        </div>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {step === 'dest' ? (
              <motion.div
                key="dest"
                {...phaseMotion}
                className={cn(
                  'grid gap-4',
                  destinations.length === 1 ? 'mx-auto max-w-xl' : 'sm:grid-cols-2'
                )}
              >
                {destinations.map((dest) => {
                  const catalog = findCatalogDestination(dest.slug);
                  const cover = coverForDestination(dest.slug);
                  return (
                    <article
                      key={dest.slug}
                      className="relative isolate overflow-hidden rounded-3xl bg-[#161d2b] shadow-[0_20px_50px_-28px_rgba(0,0,0,0.65)]"
                    >
                      <div className="relative h-[min(62vh,520px)] min-h-[320px] w-full">
                        <Image
                          src={cover}
                          alt={dest.name}
                          fill
                          priority
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 520px"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/40 to-transparent" />
                        <p className="absolute left-4 top-4 rounded-full bg-[#0b1220] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                          {catalog?.continent ?? dest.slug}
                        </p>
                        <div className="absolute inset-x-0 bottom-0 space-y-3 p-5">
                          <h3 className="font-display text-3xl font-semibold text-white">
                            {dest.emoji} {dest.name}
                          </h3>
                          <p className="text-sm text-white">{dest.vibe}</p>
                          <div className="flex flex-wrap gap-2">
                            {dest.allowedDurations.map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => pickDuration(dest.slug, n)}
                                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[#0b1220]"
                              >
                                {n} giorni
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </motion.div>
            ) : null}

            {step === 'plan' && template ? (
              <motion.div key="plan" {...phaseMotion} className="composer-panel space-y-5 rounded-3xl p-6 md:p-8">
                <div className="flex flex-wrap gap-2">
                  {templatesForDestination(template.destination_slug).map((t) => (
                    <button
                      key={t.template_id}
                      type="button"
                      onClick={() => setDuration(t.duration_days)}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                        t.duration_days === template.duration_days
                          ? 'bg-accent text-[#0b1220]'
                          : 'border border-[#2a3344] bg-[#0b1220] text-white/80 hover:bg-[#1c2436]'
                      )}
                    >
                      {t.duration_days} giorni
                    </button>
                  ))}
                </div>
                <p className="text-white/85">{template.summary}</p>
                <div className="flex items-center gap-3 rounded-2xl bg-[#0b1220] px-4 py-3">
                  <Wallet className="h-4 w-4 text-accent" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-white/45">
                      {COMPLIANCE_COPY.budgetLabel}
                    </p>
                    <p className="text-sm font-medium text-white">
                      ~{template.budget_orientative_eur.total_hint.toLocaleString('it-IT')} € a persona
                    </p>
                  </div>
                </div>
                <ol className="space-y-2">
                  {template.days.map((day) => (
                    <li key={day.day_number} className="rounded-2xl bg-[#0b1220] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-accent">
                        Giorno {day.day_number}
                      </p>
                      <p className="font-semibold text-white">{day.title}</p>
                      <p className="mt-1 text-sm text-white/70">{day.description}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                        <MapPin className="h-3 w-3" />
                        {day.area_segment}
                      </p>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-white/50">
                  {COMPLIANCE_COPY.separateBooking} {COMPLIANCE_COPY.notAPackage}
                </p>
              </motion.div>
            ) : null}

            {step === 'who' ? (
              <motion.div key="who" {...phaseMotion} className="grid gap-3 sm:grid-cols-3">
                <PhotoChoiceCard
                  cover={WHO_COVERS.solo}
                  active={mode === 'solo'}
                  onClick={() => setMode('solo')}
                  kicker="Privato"
                  title="Da solo"
                  body="Date tue. Poi i voli."
                />
                <PhotoChoiceCard
                  cover={WHO_COVERS.friends}
                  active={mode === 'friends'}
                  onClick={() => setMode('friends')}
                  kicker="Privato"
                  title="Con amici"
                  body="Stesse date. Invito."
                />
                <PhotoChoiceCard
                  cover={WHO_COVERS.group}
                  active={mode === 'group'}
                  onClick={() => setMode('group')}
                  kicker="Ufficiale"
                  title="In gruppo"
                  body="Date già aperte. Subito i voli."
                />
              </motion.div>
            ) : null}

            {step === 'when' ? (
              <motion.div key="when" {...phaseMotion}>
                {mode === 'group' ? (
                  officialForTemplate.length === 0 ? (
                    <p className="text-sm text-white/80">Nessuna partenza ufficiale su questa durata.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {officialForTemplate.map((ed) => (
                        <PhotoChoiceCard
                          key={ed.id}
                          cover={coverForDestination(slug || 'thailandia')}
                          active={editionId === ed.id}
                          onClick={() => {
                            setEditionId(ed.id);
                            confirmWithEdition(ed.id);
                          }}
                          kicker={`${ed.confirmed_count}/${ed.min_confirmed} voli`}
                          title={template?.destination_name ?? 'Partenza'}
                          body={`${formatItDate(ed.date_from)} – ${formatItDate(ed.date_to)}`}
                        />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="composer-panel space-y-4 rounded-3xl p-6 md:p-8">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date()}
                      className="mx-auto rounded-2xl bg-white p-3 text-slate-900"
                    />
                    {range ? (
                      <p className="text-center text-sm text-white/80">
                        Rientro {format(new Date(range.date_to), 'd MMMM yyyy', { locale: it })}
                      </p>
                    ) : null}
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {step !== 'dest' ? (
          <div className="mt-6 shrink-0 border-t border-[#2a3344] bg-[#0b1220] pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-white hover:bg-[#161d2b]"
                onClick={goBack}
              >
                <ArrowLeft className="h-4 w-4" />
                Indietro
              </Button>
              {step === 'when' && mode !== 'group' ? (
                <Button
                  type="button"
                  size="lg"
                  className="rounded-full px-8 font-semibold shadow-lg shadow-accent/20"
                  disabled={pending}
                  onClick={confirm}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Conferma e vedi i voli
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : step === 'when' && mode === 'group' ? (
                <span />
              ) : (
                <Button
                  type="button"
                  size="lg"
                  className="rounded-full px-8 font-semibold shadow-lg shadow-accent/20"
                  onClick={goNext}
                >
                  Avanti
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
