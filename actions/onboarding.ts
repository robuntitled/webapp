'use server';

import { auth } from '@/auth';
import { completeUserOnboarding, updateTravelIntent } from '@/lib/data/onboarding';
import { completeOnboardingSchema } from '@/lib/validations/onboarding';
import { afterOnboardingPath } from '@/lib/onboarding/steps';
import type { TravelIntent } from '@/lib/onboarding/keywords';

export async function submitOnboarding(raw: unknown): Promise<
  { ok: true; nextPath: string } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Accedi per continuare.' };
  }

  const parsed = completeOnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Completa tutte le domande prima di continuare.' };
  }

  try {
    await completeUserOnboarding(session.user.id, parsed.data);
    return { ok: true, nextPath: afterOnboardingPath(parsed.data.intent) };
  } catch (error) {
    console.error('submitOnboarding:', error);
    return { ok: false, error: 'Salvataggio non riuscito. Riprova.' };
  }
}

export async function switchTravelIntent(intent: TravelIntent): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Accedi per continuare.' };
  }
  if (intent !== 'create' && intent !== 'book') {
    return { ok: false, error: 'Scelta non valida.' };
  }

  try {
    await updateTravelIntent(session.user.id, intent);
    return { ok: true };
  } catch (error) {
    console.error('switchTravelIntent:', error);
    return { ok: false, error: 'Non è stato possibile cambiare modalità.' };
  }
}
