import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { plannerFromKeywordIds } from '@/lib/onboarding/planner-from-keywords';
import { upsertPlannerProfile } from '@/lib/data/planner-profile';
import type { CompleteOnboardingInput } from '@/lib/validations/onboarding';
import type { TravelIntent } from '@/lib/onboarding/keywords';

export type UserOnboardingState = {
  completed: boolean;
  travelIntent: TravelIntent | null;
  homeCity: string | null;
};

export async function getUserOnboardingState(
  userId: string
): Promise<UserOnboardingState> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('onboarding_completed_at, travel_intent, home_city')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return { completed: false, travelIntent: null, homeCity: null };
  }

  const intent = data.travel_intent;
  return {
    completed: Boolean(data.onboarding_completed_at),
    travelIntent: intent === 'create' || intent === 'book' ? intent : null,
    homeCity: typeof data.home_city === 'string' ? data.home_city : null,
  };
}

export async function completeUserOnboarding(
  userId: string,
  input: CompleteOnboardingInput
): Promise<void> {
  const uniqueIds = [...new Set(input.keywordIds)];
  const now = new Date().toISOString();

  const userPatch: Record<string, unknown> = {
    travel_intent: input.intent,
    home_city: input.home.city,
    home_country: input.home.country ?? null,
    home_lat: input.home.lat,
    home_lng: input.home.lng,
    home_place_id: input.home.placeId ?? null,
    address_city: input.home.city,
    onboarding_completed_at: now,
  };
  if (input.home.country) userPatch.country = input.home.country;

  const { error: userError } = await supabaseAdmin
    .from('users')
    .update(userPatch)
    .eq('id', userId);

  if (userError) throw new Error(userError.message);

  const { error: delError } = await supabaseAdmin
    .from('user_interests')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'onboarding');

  if (delError) throw new Error(delError.message);

  const { error: insError } = await supabaseAdmin.from('user_interests').insert(
    uniqueIds.map((keyword_id) => ({
      user_id: userId,
      keyword_id,
      source: 'onboarding',
    }))
  );

  if (insError) throw new Error(insError.message);

  await upsertPlannerProfile(userId, plannerFromKeywordIds(uniqueIds));
}

export async function updateTravelIntent(
  userId: string,
  intent: TravelIntent
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('users')
    .update({ travel_intent: intent })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}
