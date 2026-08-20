'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ComposerWizardHeader } from '@/components/composer/ComposerWizardHeader';
import {
  ACCOMMODATION_OPTIONS,
  BUDGET_OPTIONS,
  EXPERIENCE_OPTIONS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
  TRAVEL_STYLE_OPTIONS,
} from '@/lib/composer/planner-options';
import type { PlannerProfile } from '@/types/planner';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const MICRO_STEPS = [
  { id: 1, label: 'Stile di viaggio' },
  { id: 2, label: 'Interessi' },
          { id: 3, label: 'Budget orientativo' },
  { id: 4, label: 'Note personali' },
] as const;

type ComposerIntakeStepProps = {
  profile: PlannerProfile;
  onChange: (profile: PlannerProfile) => void;
  onContinue: () => void;
  saving?: boolean;
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
      className={`composer-chip text-left ${active ? 'composer-chip-active' : ''}`}
    >
      {children}
    </button>
  );
}

export function ComposerIntakeStep({
  profile,
  onChange,
  onContinue,
  saving,
}: ComposerIntakeStepProps) {
  const [micro, setMicro] = useState(1);

  const patch = (partial: Partial<PlannerProfile>) => {
    onChange({ ...profile, ...partial });
  };

  const toggleInterest = (id: string) => {
    const next = profile.interests.includes(id)
      ? profile.interests.filter((i) => i !== id)
      : [...profile.interests, id].slice(0, 8);
    patch({ interests: next });
  };

  const canNext =
    micro === 1
      ? Boolean(profile.travelStyle && profile.pace)
      : micro === 2
        ? profile.interests.length >= 1
        : micro === 3
          ? Boolean(profile.budgetLevel && profile.accommodationPref && profile.experienceLevel)
          : true;

  const goNext = () => {
    if (micro < 4) setMicro((m) => m + 1);
    else onContinue();
  };

  const microMeta = MICRO_STEPS[micro - 1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      <ComposerWizardHeader
        step="intake"
        microStep={micro}
        microTotal={4}
        microLabel={microMeta.label}
        title={
          micro === 1
            ? 'Come ti piace viaggiare?'
            : micro === 2
              ? 'Cosa ti ispira?'
              : micro === 3
                ? 'Budget e comfort'
                : 'Qualcosa da sapere su di te'
        }
        subtitle={
          micro === 1
            ? 'Salviamo queste preferenze su Supabase — l\'AI le userà per consigli su misura ora e in futuro.'
            : micro === 4
              ? 'Allergie, mobilità, desideri: opzionale ma utile per suggerimenti più precisi.'
              : undefined
        }
      />

      <div className="composer-glass rounded-3xl p-6 md:p-8 space-y-6">
        <AnimatePresence mode="wait">
          {micro === 1 && (
            <motion.div
              key="m1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
                  Stile principale
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRAVEL_STYLE_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.id}
                      active={profile.travelStyle === opt.id}
                      onClick={() => patch({ travelStyle: opt.id })}
                    >
                      {opt.emoji} {opt.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
                  Ritmo della giornata
                </p>
                <div className="grid gap-2">
                  {PACE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patch({ pace: opt.id })}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        profile.pace === opt.id
                          ? 'border-accent/40 bg-accent/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20'
                      }`}
                    >
                      <span className="font-medium text-sm">{opt.label}</span>
                      <span className="block text-xs text-white/45 mt-0.5">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {micro === 2 && (
            <motion.div
              key="m2"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-3"
            >
              <p className="text-xs text-white/45">Scegli almeno 1, massimo 8</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.id}
                    active={profile.interests.includes(opt.id)}
                    onClick={() => toggleInterest(opt.id)}
                  >
                    {opt.emoji} {opt.label}
                  </Chip>
                ))}
              </div>
            </motion.div>
          )}

          {micro === 3 && (
            <motion.div
              key="m3"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
                  Budget orientativo
                </p>
                <div className="grid gap-2">
                  {BUDGET_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patch({ budgetLevel: opt.id })}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        profile.budgetLevel === opt.id
                          ? 'border-accent/40 bg-accent/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/70'
                      }`}
                    >
                      <span className="font-medium text-sm">{opt.label}</span>
                      <span className="block text-xs text-white/45 mt-0.5">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
                  Alloggio preferito
                </p>
                <div className="flex flex-wrap gap-2">
                  {ACCOMMODATION_OPTIONS.map((opt) => (
                    <Chip
                      key={opt.id}
                      active={profile.accommodationPref === opt.id}
                      onClick={() => patch({ accommodationPref: opt.id })}
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
                  Esperienza con la destinazione
                </p>
                <div className="grid gap-2">
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patch({ experienceLevel: opt.id })}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        profile.experienceLevel === opt.id
                          ? 'border-accent/40 bg-accent/10 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/70'
                      }`}
                    >
                      <span className="font-medium text-sm">{opt.label}</span>
                      <span className="block text-xs text-white/45 mt-0.5">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {micro === 4 && (
            <motion.div
              key="m4"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/45">
                  Dieta / allergie
                </label>
                <Textarea
                  className="min-h-[72px] rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
                  placeholder="Es. vegetariano, senza glutine…"
                  value={profile.dietaryNotes ?? ''}
                  onChange={(e) => patch({ dietaryNotes: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/45">
                  Mobilità / accessibilità
                </label>
                <Textarea
                  className="min-h-[72px] rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
                  placeholder="Es. poco cammino, evitare scale…"
                  value={profile.mobilityNotes ?? ''}
                  onChange={(e) => patch({ mobilityNotes: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/45">
                  Altro per l&apos;AI
                </label>
                <Textarea
                  className="min-h-[88px] rounded-xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/30"
                  placeholder="Es. viaggio fotografico, niente club, early bird…"
                  value={profile.freeNotes ?? ''}
                  onChange={(e) => patch({ freeNotes: e.target.value || undefined })}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
            disabled={micro === 1}
            onClick={() => setMicro((m) => Math.max(1, m - 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>

          <Button
            type="button"
            className="rounded-xl min-w-[140px]"
            disabled={!canNext || saving}
            onClick={() => goNext()}
          >
            {saving ? (
              'Salvo…'
            ) : micro === 4 ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Inizia il viaggio
              </>
            ) : (
              <>
                Avanti
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}