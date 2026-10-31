import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { plannerProfileSchema } from '@/lib/validations/planner';
import type { PlannerProfile } from '@/types/planner';

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
