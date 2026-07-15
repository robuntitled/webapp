import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { plannerProfileSchema } from '@/lib/validations/planner';
import type { PlannerProfile } from '@/types/planner';
import type { ComposerDraft } from '@/types/composer';
import {
  normalizeWizardStep,
  type ComposerWizardStep,
} from '@/lib/composer/wizard-steps';

export type { ComposerWizardStep } from '@/lib/composer/wizard-steps';

export async function getPlannerProfile(userId: string): Promise<PlannerProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('planner_profiles')
    .select('profile')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.profile) return null;

  const parsed = plannerProfileSchema.safeParse(data.profile);
  return parsed.success ? parsed.data : null;
}

export async function upsertPlannerProfile(
  userId: string,
  profile: PlannerProfile
): Promise<PlannerProfile> {
  const parsed = plannerProfileSchema.parse(profile);

  const { error } = await supabaseAdmin.from('planner_profiles').upsert(
    {
      user_id: userId,
      profile: parsed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) throw new Error(error.message);
  return parsed;
}

export async function getComposerDraft(userId: string): Promise<{
  draft: Partial<ComposerDraft>;
  currentStep: ComposerWizardStep;
  plannerProfile: PlannerProfile | null;
} | null> {
  const { data, error } = await supabaseAdmin
    .from('composer_drafts')
    .select('draft, current_step, planner_profile')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const plannerParsed = data.planner_profile
    ? plannerProfileSchema.safeParse(data.planner_profile)
    : null;

  return {
    draft: (data.draft as Partial<ComposerDraft>) ?? {},
    currentStep: normalizeWizardStep(data.current_step),
    plannerProfile: plannerParsed?.success ? plannerParsed.data : null,
  };
}

export async function upsertComposerDraft(
  userId: string,
  payload: {
    draft: Partial<ComposerDraft>;
    currentStep: ComposerWizardStep;
    plannerProfile?: PlannerProfile | null;
  }
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: userId,
    draft: payload.draft,
    current_step: payload.currentStep,
    updated_at: new Date().toISOString(),
  };

  if (payload.plannerProfile) {
    row.planner_profile = plannerProfileSchema.parse(payload.plannerProfile);
  }

  const { error } = await supabaseAdmin
    .from('composer_drafts')
    .upsert(row, { onConflict: 'user_id' });

  if (error) throw new Error(error.message);
}

export async function deleteComposerDraft(userId: string): Promise<void> {
  await supabaseAdmin.from('composer_drafts').delete().eq('user_id', userId);
}