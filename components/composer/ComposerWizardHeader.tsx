'use client';

import { motion } from 'framer-motion';
import {
  WIZARD_STEPS,
  wizardStepLabel,
  normalizeWizardStep,
  type ComposerWizardStep,
  type LegacyComposerWizardStep,
} from '@/lib/composer/wizard-steps';

type WizardHeaderStep = ComposerWizardStep | LegacyComposerWizardStep;

type ComposerWizardHeaderProps = {
  step: WizardHeaderStep;
  microStep?: number;
  microTotal?: number;
  microLabel?: string;
  title: string;
  subtitle?: string;
};

export function ComposerWizardHeader({
  step,
  microStep,
  microTotal,
  microLabel,
  title,
  subtitle,
}: ComposerWizardHeaderProps) {
  const normalized = normalizeWizardStep(step);
  const mainIndex = WIZARD_STEPS.indexOf(normalized);
  const stepLabel = wizardStepLabel(normalized);

  const progressLabel =
    microStep != null && microTotal != null && microLabel
      ? `Step ${mainIndex + 1} di ${WIZARD_STEPS.length} · ${microLabel} (${microStep}/${microTotal})`
      : `Step ${mainIndex + 1} di ${WIZARD_STEPS.length} · ${stepLabel}`;

  return (
    <div className="text-center space-y-4 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-white/90"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        {progressLabel}
      </motion.div>

      <div className="flex items-center justify-center gap-2 px-4">
        {WIZARD_STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              s === normalized
                ? 'w-10 bg-accent'
                : i < mainIndex
                  ? 'w-5 bg-accent/50'
                  : 'w-5 bg-white/15'
            }`}
          />
        ))}
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight"
      >
        {title}
      </motion.h2>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/90 max-w-xl mx-auto text-base leading-relaxed"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}