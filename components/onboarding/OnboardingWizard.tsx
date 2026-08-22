'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Compass, Loader2, MapPin, PenLine, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PlaceSearchInput } from '@/components/composer/plan/PlaceSearchInput';
import { submitOnboarding } from '@/actions/onboarding';
import { type TravelIntent } from '@/lib/onboarding/keywords';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import {
  EMPTY_ONBOARDING_DRAFT,
  ONBOARDING_STEPS,
  nextOnboardingStep,
  onboardingStepIndex,
  prevOnboardingStep,
  type OnboardingDraft,
  type OnboardingHome,
  type OnboardingStepId,
} from '@/lib/onboarding/steps';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'nl-onboarding-v2';

function loadDraft(): OnboardingDraft {
  if (typeof window === 'undefined') return EMPTY_ONBOARDING_DRAFT;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_ONBOARDING_DRAFT;
    const parsed = JSON.parse(raw) as OnboardingDraft;
    return {
      intent: parsed.intent === 'create' || parsed.intent === 'book' ? parsed.intent : null,
      keywordIds: Array.isArray(parsed.keywordIds) ? parsed.keywordIds : [],
      home: parsed.home?.city && typeof parsed.home.lat === 'number' ? parsed.home : null,
    };
  } catch {
    return EMPTY_ONBOARDING_DRAFT;
  }
}

export function OnboardingWizard() {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState<OnboardingStepId>('model');
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_ONBOARDING_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  const patch = (partial: Partial<OnboardingDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const goNext = () => {
    const next = nextOnboardingStep(step);
    if (next) setStep(next);
  };

  const goPrev = () => {
    const prev = prevOnboardingStep(step);
    if (prev) setStep(prev);
  };

  const finish = (intent = draft.intent) => {
    if (!intent || !draft.home) {
      toast.error('Scegli Crea o Esplora e indica da dove parti.');
      return;
    }
    startTransition(async () => {
      const result = await submitOnboarding({
        intent,
        keywordIds: draft.keywordIds,
        home: draft.home,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      sessionStorage.removeItem(STORAGE_KEY);
      await update({
        onboardingCompleted: true,
        travelIntent: draft.intent,
      });
      router.push(result.nextPath);
      router.refresh();
    });
  };

  const progress = onboardingStepIndex(step);

  return (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-2xl flex-col justify-center px-4 py-12">
      <div className="mb-8 flex items-center justify-between text-xs text-white/55">
        <span className="font-medium uppercase tracking-[0.16em]">Inizio</span>
        <span>
          {progress} / {ONBOARDING_STEPS.length}
        </span>
      </div>
      <div className="mb-8 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${(progress / ONBOARDING_STEPS.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
        >
          {step === 'model' && (
            <ModelStep onNext={goNext} />
          )}
          {step === 'home' && (
            <HomeStep
              value={draft.home}
              onChange={(home) => patch({ home })}
              onBack={goPrev}
              onFinish={goNext}
              pending={false}
            />
          )}
          {step === 'intent' && (
            <IntentStep
              value={draft.intent}
              onSelect={(intent) => {
                patch({ intent });
                finish(intent);
              }}
              onBack={goPrev}
              pending={pending}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ModelStep({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent">
        Come funziona
      </p>
      <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
        Gruppo sì. Pacchetto no.
      </h1>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-white/90">
        {COMPLIANCE_COPY.guide}
      </p>
      <div className="mt-8 rounded-3xl border border-white/12 bg-white/[0.05] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          Esempio
        </p>
        <p className="mt-2 font-display text-xl font-semibold text-white">
          Thailandia · 14 giorni
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          Piano ufficiale NomadLink. Marco parte da solo a novembre, Giulia entra su una partenza
          di gruppo: stesso itinerario, voli e hotel prenotati ciascuno col proprio fornitore.
        </p>
      </div>
      <div className="mt-10">
        <Button type="button" className="rounded-full" onClick={onNext}>
          Ho capito
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function IntentStep({
  value,
  onSelect,
  onBack,
  pending,
}: {
  value: TravelIntent | null;
  onSelect: (intent: TravelIntent) => void;
  onBack: () => void;
  pending: boolean;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent">
        Ultimo passo
      </p>
      <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
        Scegli un itinerario o una partenza
      </h1>
      <p className="mt-4 max-w-md text-base text-white/90">
        Scelta obbligatoria. I servizi si prenotano dopo, ciascuno col proprio fornitore.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <IntentCard
          active={value === 'create'}
          icon={PenLine}
          title="Scegli un itinerario"
          body="Thailandia 10, 14 o 21 giorni. Poi da solo, con amici o in gruppo."
          onClick={() => onSelect('create')}
        />
        <IntentCard
          active={value === 'book'}
          icon={Ticket}
          title="Partenze di gruppo"
          body="Date ufficiali già aperte. Posto confermato = volo prenotato."
          onClick={() => onSelect('book')}
        />
      </div>
      <div className="mt-8">
        <Button type="button" variant="ghost" className="text-white/70" onClick={onBack} disabled={pending}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>
      </div>
    </div>
  );
}

function IntentCard({
  active,
  icon: Icon,
  title,
  body,
  onClick,
}: {
  active: boolean;
  icon: typeof PenLine;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[1.75rem] border p-6 text-left transition',
        'bg-white/[0.04] hover:bg-white/[0.08]',
        active
          ? 'border-accent ring-2 ring-accent/40'
          : 'border-white/10 hover:border-white/25'
      )}
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/85">{body}</p>
    </button>
  );
}

function HomeStep({
  value,
  onChange,
  onBack,
  onFinish,
  pending,
}: {
  value: OnboardingHome | null;
  onChange: (home: OnboardingHome | null) => void;
  onBack: () => void;
  onFinish: () => void;
  pending: boolean;
}) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [query, setQuery] = useState(value?.city ?? '');

  useEffect(() => {
    if (value?.city) setQuery(value.city);
  }, [value?.city]);

  const useGeo = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalizzazione non disponibile.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/places/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          );
          const data = (await res.json()) as {
            place?: { label: string; subtitle?: string; lat: number; lng: number; id?: string; country?: string };
          };
          const place = data.place;
          if (!place) {
            toast.error('Non riesco a leggere la posizione.');
            return;
          }
          const city = place.subtitle ? `${place.label}` : place.label;
          onChange({
            city,
            country: place.country ?? null,
            lat: place.lat,
            lng: place.lng,
            placeId: place.id ?? null,
          });
          setQuery(city);
        } catch {
          toast.error('Posizione non disponibile.');
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        toast.error('Permesso posizione negato.');
      },
      { enableHighAccuracy: false, timeout: 12_000 }
    );
  };

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
        Da dove parti di solito?
      </h1>
      <p className="mt-4 max-w-md text-base text-white/90">
        La tua base. Da lì partono proposte vicine e sostenibili.
      </p>

      <div className="mt-8 space-y-3">
        <PlaceSearchInput
          value={query}
          placeholder="Città, paese…"
          onChange={(label, coords) => {
            setQuery(label);
            if (!coords) {
              onChange(null);
              return;
            }
            onChange({
              city: label.split(',')[0]?.trim() || label,
              country: label.includes(',') ? label.split(',').slice(-1)[0]?.trim() : null,
              lat: coords.lat,
              lng: coords.lng,
              placeId: null,
            });
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={useGeo}
          disabled={geoLoading}
        >
          {geoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Compass className="h-4 w-4" />
          )}
          Usa la mia posizione
        </Button>
        {value?.city ? (
          <p className="flex items-center gap-2 text-sm text-white/70">
            <MapPin className="h-4 w-4 text-accent" />
            {value.city}
            {value.country ? `, ${value.country}` : ''}
          </p>
        ) : null}
      </div>

      <StepNav
        onBack={onBack}
        onNext={onFinish}
        nextDisabled={!value?.city || pending}
        nextLabel={pending ? 'Salvo…' : 'Avanti'}
        pending={pending}
      />
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
  pending,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  nextLabel: string;
  pending?: boolean;
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="ghost"
        className="rounded-full text-white hover:text-slate-900"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Indietro
      </Button>
      <Button
        type="button"
        className="rounded-full px-6"
        onClick={onNext}
        disabled={nextDisabled || pending}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {nextLabel}
        {!pending ? <ArrowRight className="h-4 w-4" /> : null}
      </Button>
    </div>
  );
}
