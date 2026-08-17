'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Compass, Loader2, MapPin, PenLine, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PlaceSearchInput } from '@/components/composer/plan/PlaceSearchInput';
import { submitOnboarding } from '@/actions/onboarding';
import {
  keywordsForCategory,
  type InterestCategory,
  type TravelIntent,
} from '@/lib/onboarding/keywords';
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

const STORAGE_KEY = 'nl-onboarding-v1';

const KEYWORD_COPY: Record<
  InterestCategory,
  { title: string; subtitle: string; min: number; max: number }
> = {
  trip_type: {
    title: 'Che viaggio sei?',
    subtitle: 'Fino a tre. Da qui le proposte ti assomigliano.',
    min: 1,
    max: 3,
  },
  setting: {
    title: 'Natura o città?',
    subtitle: 'L’ambiente in cui ti senti a casa, quando parti.',
    min: 1,
    max: 3,
  },
  experience: {
    title: 'Cosa ti accende?',
    subtitle: 'Esperienze vere. Puoi sceglierne più di una.',
    min: 1,
    max: 4,
  },
};

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
  const [step, setStep] = useState<OnboardingStepId>('intent');
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

  const finish = () => {
    if (!draft.intent || !draft.home || draft.keywordIds.length === 0) {
      toast.error('Completa tutte le domande prima di continuare.');
      return;
    }
    startTransition(async () => {
      const result = await submitOnboarding({
        intent: draft.intent,
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
          {step === 'intent' && (
            <IntentStep
              value={draft.intent}
              onSelect={(intent) => {
                patch({ intent });
                setTimeout(() => setStep('trip_type'), 180);
              }}
            />
          )}
          {(step === 'trip_type' || step === 'setting' || step === 'experience') && (
            <KeywordStep
              category={step}
              selected={draft.keywordIds}
              onChange={(keywordIds) => patch({ keywordIds })}
              onBack={goPrev}
              onNext={goNext}
            />
          )}
          {step === 'home' && (
            <HomeStep
              value={draft.home}
              onChange={(home) => patch({ home })}
              onBack={goPrev}
              onFinish={finish}
              pending={pending}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function IntentStep({
  value,
  onSelect,
}: {
  value: TravelIntent | null;
  onSelect: (intent: TravelIntent) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent">
        Prima scelta
      </p>
      <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
        Crei, o ti unisci?
      </h1>
      <p className="mt-4 max-w-md text-base text-white/90">
        Due strade. I servizi si prenotano solo quando il gruppo è formato.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <IntentCard
          active={value === 'create'}
          icon={PenLine}
          title="Crea un viaggio"
          body="Parti da un template, pubblica in formazione, riempi i posti."
          onClick={() => onSelect('create')}
        />
        <IntentCard
          active={value === 'book'}
          icon={Ticket}
          title="Esplora e unisciti"
          body="Scegli un viaggio, unisciti, prenota quando il gruppo è pronto."
          onClick={() => onSelect('book')}
        />
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

function KeywordStep({
  category,
  selected,
  onChange,
  onBack,
  onNext,
}: {
  category: InterestCategory;
  selected: string[];
  onChange: (ids: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const copy = KEYWORD_COPY[category];
  const options = keywordsForCategory(category);
  const categoryIds = useMemo(() => new Set(options.map((o) => o.id)), [options]);
  const pickedHere = selected.filter((id) => categoryIds.has(id));

  const toggle = (id: string) => {
    const inCat = selected.filter((x) => categoryIds.has(x));
    const others = selected.filter((x) => !categoryIds.has(x));
    if (inCat.includes(id)) {
      onChange([...others, ...inCat.filter((x) => x !== id)]);
      return;
    }
    if (inCat.length >= copy.max) {
      toast.message(`Massimo ${copy.max}`);
      return;
    }
    onChange([...others, ...inCat, id]);
  };

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
        {copy.title}
      </h1>
      <p className="mt-4 max-w-md text-base text-white/90">{copy.subtitle}</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={cn(
                'rounded-full border px-4 py-2.5 text-sm font-medium transition',
                on
                  ? 'border-accent bg-accent/20 text-white'
                  : 'border-white/15 bg-white/[0.04] text-white/80 hover:border-white/30'
              )}
            >
              <span className="mr-1.5">{opt.emoji}</span>
              {opt.label}
            </button>
          );
        })}
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextDisabled={pickedHere.length < copy.min}
        nextLabel="Continua"
      />
    </div>
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
        nextLabel={pending ? 'Salvo…' : 'Entra'}
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
