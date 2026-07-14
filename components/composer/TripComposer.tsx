'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ComposerSetupStep } from '@/components/composer/ComposerSetupStep';
import { ComposerPlanStep } from '@/components/composer/ComposerPlanStep';
import { ComposerReviewStep } from '@/components/composer/ComposerReviewStep';
import { buildComposerDays } from '@/lib/composer/days';
import type { ComposerDraft, ComposerDay } from '@/types/composer';

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

type Step = 'setup' | 'plan' | 'review';

type TripComposerProps = {
  profileCity?: string | null;
  profileCountry?: string | null;
};

export function TripComposer({ profileCity, profileCountry }: TripComposerProps = {}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('setup');
  const [draft, setDraft] = useState<ComposerDraft>(EMPTY_DRAFT);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ComposerDraft;
        if (parsed.destination) setDraft(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (draft.destination) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    } catch {
      /* ignore */
    }
  }, [draft]);

  const patchDraft = useCallback((patch: Partial<ComposerDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const goToPlan = () => {
    if (!draft.startDate || !draft.endDate) return;
    const days = buildComposerDays(draft.startDate, draft.endDate);
    setDraft((prev) => ({ ...prev, days }));
    setStep('plan');
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const response = await fetch('/api/composer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.hint ? `${data.error} — ${data.hint}` : data.error ?? 'Errore pubblicazione');
        return;
      }

      localStorage.removeItem(DRAFT_KEY);
      toast.success('Viaggio lanciato! 🚀 Ora invita la crew.');
      router.push(`/viaggi/${data.tripId}`);
    } catch {
      toast.error('Errore di rete');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="composer-shell min-h-[calc(100vh-4rem)] relative overflow-hidden">
      <div className="composer-aurora" aria-hidden />

      <div className="relative z-10">
        {step !== 'plan' && (
          <div className="container mx-auto px-4 pt-6 flex items-center justify-between gap-4">
            <Button
              asChild
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
            >
              <Link href="/dashboard/miei-viaggi">
                <ArrowLeft className="mr-2 h-4 w-4" />
                I miei viaggi
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              {(['setup', 'plan', 'review'] as const).map((s, i) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    s === step
                      ? 'w-8 bg-accent'
                      : i < ['setup', 'plan', 'review'].indexOf(step)
                        ? 'w-4 bg-accent/50'
                        : 'w-4 bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="container mx-auto px-4 py-8"
            >
              <ComposerSetupStep
                draft={draft}
                profileCity={profileCity}
                profileCountry={profileCountry}
                onChange={patchDraft}
                onContinue={goToPlan}
              />
            </motion.div>
          )}

          {step === 'plan' && (
            <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ComposerPlanStep
                draft={draft}
                onChangeDays={(days: ComposerDay[]) => patchDraft({ days })}
                onPatchDraft={patchDraft}
                onBack={() => setStep('setup')}
                onReview={() => setStep('review')}
              />
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ComposerReviewStep
                draft={draft}
                publishing={publishing}
                onBack={() => setStep('plan')}
                onPublish={() => void publish()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}