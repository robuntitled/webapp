'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ComposerAssistantDock } from '@/components/composer/ComposerAssistantDock';
import { ComposerLandingStep } from '@/components/composer/ComposerLandingStep';
import { ComposerPlanStep } from '@/components/composer/ComposerPlanStep';
import { ComposerReviewStep } from '@/components/composer/ComposerReviewStep';
import { ComposerSourceStep } from '@/components/composer/ComposerSourceStep';
import { buildComposerDays } from '@/lib/composer/days';
import { addDays, format } from 'date-fns';
import {
  draftFromTripTemplate,
  findTripTemplate,
  type TripTemplate,
} from '@/lib/composer/trip-templates';
import {
  clearComposerDraft,
  saveComposerDraft,
  type ComposerWizardStep,
} from '@/lib/composer/client-planner';
import {
  clearComposerLocalSession,
  readComposerLocalSession,
  writeComposerLocalSession,
} from '@/lib/composer/local-draft';
import { validatePublishDraft } from '@/lib/composer/publish-validation';
import { normalizeWizardStep, WIZARD_STEPS } from '@/lib/composer/wizard-steps';
import type { ComposerDraft, ComposerDay } from '@/types/composer';
import { EMPTY_PLANNER_PROFILE, type PlannerProfile } from '@/types/planner';
import { PhoneVerifyGate } from '@/components/auth/PhoneVerifyGate';

const EMPTY_DRAFT: ComposerDraft = {
  title: '',
  destination: '',
  startDate: '',
  endDate: '',
  planningMode: 'solo',
  maxParticipants: 8,
  minParticipants: 4,
  days: [],
};

type TripComposerProps = {
  profileCity?: string | null;
  profileCountry?: string | null;
  initialPlannerProfile?: PlannerProfile | null;
  initialDraft?: Partial<ComposerDraft> | null;
  initialStep?: ComposerWizardStep;
  /** true solo quando si riprende da I miei viaggi → Bozze */
  resumeDraft?: boolean;
  /** Nuovo viaggio: non ripristinare localStorage / bozza cloud */
  forceNew?: boolean;
  initialTemplateId?: string;
};

function mergeDraft(
  base: ComposerDraft,
  partial?: Partial<ComposerDraft> | null,
  profile?: PlannerProfile | null
): ComposerDraft {
  return {
    ...base,
    ...partial,
    plannerProfile: partial?.plannerProfile ?? profile ?? undefined,
  };
}

export function TripComposer({
  profileCity,
  profileCountry,
  initialPlannerProfile,
  initialDraft,
  initialStep = 'source',
  resumeDraft = false,
  forceNew = false,
  initialTemplateId,
}: TripComposerProps = {}) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<ComposerWizardStep>(normalizeWizardStep(initialStep));
  const [draft, setDraft] = useState<ComposerDraft>(() =>
    mergeDraft(EMPTY_DRAFT, initialDraft, initialPlannerProfile)
  );
  const [publishing, setPublishing] = useState(false);
  const [phoneGateOpen, setPhoneGateOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plannerProfile =
    draft.plannerProfile ?? initialPlannerProfile ?? EMPTY_PLANNER_PROFILE;

  // Resume da Bozze, oppure nuovo viaggio pulito (mai riprendere bozza da Organizza)
  useEffect(() => {
    if (resumeDraft && initialDraft?.destination) {
      const merged = mergeDraft(EMPTY_DRAFT, initialDraft, initialPlannerProfile);
      setDraft(merged);
      setStep(normalizeWizardStep(initialStep));
      writeComposerLocalSession(merged, normalizeWizardStep(initialStep));
      setHydrated(true);
      return;
    }

    if (forceNew) {
      clearComposerLocalSession();
      const template = initialTemplateId ? findTripTemplate(initialTemplateId) : undefined;
      if (template) {
        const start = format(addDays(new Date(), 21), 'yyyy-MM-dd');
        const partial = draftFromTripTemplate(template, start);
        setDraft(
          mergeDraft(
            EMPTY_DRAFT,
            { ...partial, minParticipants: 4, maxParticipants: 8, plannerProfile: initialPlannerProfile ?? undefined },
            initialPlannerProfile
          )
        );
        setStep('landing');
      } else {
        setDraft(mergeDraft(EMPTY_DRAFT, initialDraft, initialPlannerProfile));
        setStep(normalizeWizardStep(initialStep === 'landing' ? 'source' : initialStep));
      }
      setHydrated(true);
      return;
    }

    // Refresh pagina mid-flow: ripristina sessione locale
    const local = readComposerLocalSession();
    if (local) {
      setDraft((prev) => ({
        ...prev,
        ...local.draft,
        plannerProfile:
          local.draft.plannerProfile ?? initialPlannerProfile ?? prev.plannerProfile,
      }));
      setStep(local.step);
    }
    setHydrated(true);
  }, [resumeDraft, forceNew, initialDraft, initialPlannerProfile, initialStep, initialTemplateId]);

  const scheduleCloudSave = useCallback(
    (nextDraft: ComposerDraft, nextStep: ComposerWizardStep, profile: PlannerProfile) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveComposerDraft({
          draft: { ...nextDraft, plannerProfile: profile },
          currentStep: nextStep,
          plannerProfile: profile,
        }).catch(() => undefined);
      }, 2000);
    },
    []
  );

  // Persist draft + step on every change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (draft.destination?.trim()) {
        const withProfile = { ...draft, plannerProfile };
        writeComposerLocalSession(withProfile, step);
        scheduleCloudSave(withProfile, step, plannerProfile);
      }
    } catch {
      /* ignore */
    }
  }, [draft, step, plannerProfile, scheduleCloudSave, hydrated]);

  const patchDraft = useCallback((patch: Partial<ComposerDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyTemplate = (template: TripTemplate) => {
    const start =
      draft.startDate || format(addDays(new Date(), 21), 'yyyy-MM-dd');
    const partial = draftFromTripTemplate(template, start);
    setDraft(
      mergeDraft(
        EMPTY_DRAFT,
        {
          ...partial,
          minParticipants: 4,
          maxParticipants: 8,
          plannerProfile,
        },
        plannerProfile
      )
    );
    setStep('landing');
  };

  const goToCompose = () => {
    if (!draft.startDate || !draft.endDate) return;
    const days =
      draft.days.length > 0 ? draft.days : buildComposerDays(draft.startDate, draft.endDate);
    setDraft((prev) => ({ ...prev, days }));
    setStep('plan');
  };

  const publish = async () => {
    const issues = validatePublishDraft(draft);
    if (issues.length > 0) {
      toast.error(issues[0].message);
      return;
    }
    setPublishing(true);
    try {
      const payload = { ...draft, plannerProfile };
      const response = await fetch('/api/composer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'PHONE_VERIFY_REQUIRED' || /telefono/i.test(String(data.error ?? ''))) {
          setPhoneGateOpen(true);
          return;
        }
        toast.error(data.hint ? `${data.error} — ${data.hint}` : data.error ?? 'Errore pubblicazione');
        return;
      }

      clearComposerLocalSession();
      await clearComposerDraft().catch(() => undefined);
      toast.success('Pubblicato in formazione. La garanzia resta attiva fino al minimo posti.');
      router.push(`/viaggi/${data.tripId}`);
    } catch {
      toast.error('Errore di rete');
    } finally {
      setPublishing(false);
    }
  };

  const stepIndex = WIZARD_STEPS.indexOf(step);

  // Avoid flashing landing before localStorage restore
  if (!hydrated) {
    return (
      <div className="composer-shell flex h-full min-h-[40vh] items-center justify-center">
        <p className="text-sm text-white/50">Caricamento bozza…</p>
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col overflow-hidden ${
        step === 'plan' ? 'bg-[#f4f7fa]' : 'composer-shell'
      }`}
    >
      <PhoneVerifyGate
        open={phoneGateOpen}
        onOpenChange={setPhoneGateOpen}
        onVerified={() => {
          void publish();
        }}
      />
      {step !== 'plan' && <div className="composer-aurora" aria-hidden />}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {resumeDraft && draft.destination && step !== 'plan' && (
          <div className="container mx-auto px-4 pt-4">
            <p className="rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200/80">
              Stai riprendendo una bozza salvata — da &quot;I miei viaggi → Bozze&quot;
            </p>
          </div>
        )}

        {step !== 'plan' && (
          <div className="container mx-auto flex items-center justify-between gap-4 px-4 pt-6">
            <Button
              asChild
              variant="ghost"
              className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard/miei-viaggi">
                <ArrowLeft className="mr-2 h-4 w-4" />
                I miei viaggi
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              {WIZARD_STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    s === step
                      ? 'w-8 bg-accent'
                      : i < stepIndex
                        ? 'w-4 bg-accent/50'
                        : 'w-4 bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'source' && (
            <motion.div
              key="source"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="container mx-auto flex-1 overflow-y-auto px-4 py-8"
            >
              <ComposerSourceStep
                onScratch={() => {
                  setDraft(mergeDraft(EMPTY_DRAFT, { plannerProfile }, plannerProfile));
                  setStep('landing');
                }}
                onTemplate={applyTemplate}
                onCustomize={applyTemplate}
              />
            </motion.div>
          )}

          {step === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="container mx-auto flex-1 overflow-y-auto px-4 py-8"
            >
              <ComposerLandingStep
                draft={draft}
                onChange={patchDraft}
                onStart={goToCompose}
                onBack={() => setStep('source')}
                profileCity={profileCity}
                profileCountry={profileCountry}
              />
            </motion.div>
          )}

          {step === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <ComposerPlanStep
                draft={{ ...draft, plannerProfile }}
                onChangeDays={(days: ComposerDay[]) => patchDraft({ days })}
                onPatchDraft={patchDraft}
                onBack={() => setStep('landing')}
                onReview={() => setStep('review')}
              />
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto"
            >
              <ComposerReviewStep
                draft={{ ...draft, plannerProfile }}
                publishing={publishing}
                onBack={() => setStep('plan')}
                onPublish={() => void publish()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ComposerAssistantDock
        draft={{ ...draft, plannerProfile }}
        step={step}
        plannerProfile={plannerProfile}
      />
    </div>
  );
}
