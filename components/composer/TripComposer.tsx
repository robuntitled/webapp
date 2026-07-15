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
import { buildComposerDays } from '@/lib/composer/days';
import {
  clearComposerDraft,
  saveComposerDraft,
  type ComposerWizardStep,
} from '@/lib/composer/client-planner';
import { WIZARD_STEPS } from '@/lib/composer/wizard-steps';
import type { ComposerDraft, ComposerDay } from '@/types/composer';
import { EMPTY_PLANNER_PROFILE, type PlannerProfile } from '@/types/planner';

const DRAFT_KEY = 'nomadlink-composer-draft';

const EMPTY_DRAFT: ComposerDraft = {
  title: '',
  destination: '',
  startDate: '',
  endDate: '',
  planningMode: 'group',
  maxParticipants: 8,
  days: [],
};

type TripComposerProps = {
  profileCity?: string | null;
  profileCountry?: string | null;
  initialPlannerProfile?: PlannerProfile | null;
  initialDraft?: Partial<ComposerDraft> | null;
  initialStep?: ComposerWizardStep;
};

export function TripComposer({
  initialPlannerProfile,
  initialDraft,
  initialStep = 'landing',
}: TripComposerProps = {}) {
  const router = useRouter();
  const [step, setStep] = useState<ComposerWizardStep>(initialStep);
  const [draft, setDraft] = useState<ComposerDraft>({
    ...EMPTY_DRAFT,
    ...initialDraft,
    plannerProfile: initialPlannerProfile ?? undefined,
  });
  const [publishing, setPublishing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plannerProfile =
    draft.plannerProfile ?? initialPlannerProfile ?? EMPTY_PLANNER_PROFILE;

  useEffect(() => {
    if (initialDraft?.destination) return;

    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ComposerDraft;
        if (parsed.destination) {
          setDraft((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      /* ignore */
    }
  }, [initialDraft?.destination]);

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

  useEffect(() => {
    try {
      if (draft.destination) {
        const withProfile = { ...draft, plannerProfile };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(withProfile));
        scheduleCloudSave(withProfile, step, plannerProfile);
      }
    } catch {
      /* ignore */
    }
  }, [draft, step, plannerProfile, scheduleCloudSave]);

  const patchDraft = useCallback((patch: Partial<ComposerDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const goToCompose = () => {
    if (!draft.startDate || !draft.endDate) return;
    const days =
      draft.days.length > 0 ? draft.days : buildComposerDays(draft.startDate, draft.endDate);
    setDraft((prev) => ({ ...prev, days }));
    setStep('plan');
  };

  const publish = async () => {
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
        toast.error(data.hint ? `${data.error} — ${data.hint}` : data.error ?? 'Errore pubblicazione');
        return;
      }

      localStorage.removeItem(DRAFT_KEY);
      await clearComposerDraft().catch(() => undefined);
      toast.success('Viaggio lanciato! 🚀 Ora invita la crew.');
      router.push(`/viaggi/${data.tripId}`);
    } catch {
      toast.error('Errore di rete');
    } finally {
      setPublishing(false);
    }
  };

  const stepIndex = WIZARD_STEPS.indexOf(step);

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col overflow-hidden ${
        step === 'plan' ? 'bg-[#f4f7fa]' : 'composer-shell'
      }`}
    >
      {step !== 'plan' && <div className="composer-aurora" aria-hidden />}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
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