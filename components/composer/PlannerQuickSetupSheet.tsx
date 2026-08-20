'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { savePlannerProfile } from '@/lib/composer/client-planner';
import {
  BUDGET_OPTIONS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
} from '@/lib/composer/planner-options';
import type { PlannerProfile, PlannerTravelDistance } from '@/types/planner';
import { EMPTY_PLANNER_PROFILE } from '@/types/planner';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const DISTANCE_OPTIONS: { id: PlannerTravelDistance; label: string; hint: string }[] = [
  { id: 'near', label: 'Vicino', hint: 'Europa, max 3–4h di volo' },
  { id: 'medium', label: 'Media distanza', hint: 'Mediterraneo, Nord Africa, UK' },
  { id: 'far', label: 'Lontano', hint: 'Asia, Americhe, Oceania' },
];

type PlannerQuickSetupSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProfile?: PlannerProfile | null;
  onSaved: (profile: PlannerProfile) => void;
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm transition-all ${
        active
          ? 'border-accent bg-accent/15 text-white font-medium'
          : 'border-white/15 text-white/65 hover:border-white/30'
      }`}
    >
      {children}
    </button>
  );
}

export function PlannerQuickSetupSheet({
  open,
  onOpenChange,
  initialProfile,
  onSaved,
}: PlannerQuickSetupSheetProps) {
  const [profile, setProfile] = useState<PlannerProfile>({
    ...EMPTY_PLANNER_PROFILE,
    ...initialProfile,
  });
  const [saving, setSaving] = useState(false);

  const toggleInterest = (id: string) => {
    setProfile((p) => ({
      ...p,
      interests: p.interests.includes(id)
        ? p.interests.filter((i) => i !== id)
        : [...p.interests, id].slice(0, 8),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePlannerProfile(profile);
      onSaved(profile);
      onOpenChange(false);
      toast.success('Preferenze salvate — suggerimenti aggiornati');
    } catch {
      toast.error('Errore nel salvataggio');
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0b1120] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b1120]/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs uppercase tracking-widest text-accent">Personalizza</p>
                <h2 className="font-display text-lg font-semibold text-white">
                  Esperienza su misura
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-8 px-5 py-6 pb-28">
              <section className="space-y-3">
                <p className="text-sm font-medium text-white/80">Ritmo della giornata</p>
                <div className="flex flex-wrap gap-2">
                  {PACE_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.id}
                      active={profile.pace === opt.id}
                      onClick={() => setProfile((p) => ({ ...p, pace: opt.id }))}
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-medium text-white/80">Interessi</p>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.id}
                      active={profile.interests.includes(opt.id)}
                      onClick={() => toggleInterest(opt.id)}
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-medium text-white/80">Budget orientativo</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {BUDGET_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setProfile((p) => ({ ...p, budgetLevel: opt.id }))}
                      className={`rounded-2xl border p-3 text-left text-sm transition ${
                        profile.budgetLevel === opt.id
                          ? 'border-accent bg-accent/10 text-white'
                          : 'border-white/15 text-white/60 hover:border-white/25'
                      }`}
                    >
                      <span className="font-medium block">{opt.label}</span>
                      <span className="text-xs text-white/45 mt-0.5">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-sm font-medium text-white/80">Quanto lontano vuoi andare?</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DISTANCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setProfile((p) => ({ ...p, travelDistance: opt.id }))}
                      className={`rounded-2xl border p-3 text-left text-sm transition ${
                        profile.travelDistance === opt.id
                          ? 'border-accent bg-accent/10 text-white'
                          : 'border-white/15 text-white/60 hover:border-white/25'
                      }`}
                    >
                      <span className="font-medium block">{opt.label}</span>
                      <span className="text-xs text-white/45 mt-0.5">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-[#0b1120]/95 px-5 py-4 backdrop-blur">
              <Button
                type="button"
                className="w-full rounded-full h-12 font-semibold"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? 'Salvo...' : 'Salva e aggiorna suggerimenti'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}