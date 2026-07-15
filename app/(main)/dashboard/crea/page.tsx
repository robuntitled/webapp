import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TripComposer } from '@/components/composer/TripComposer';
import { getComposerDraft, getPlannerProfile } from '@/lib/data/planner-profile';
import { getUserProfile } from '@/lib/data/users';
import { normalizeWizardStep } from '@/lib/composer/wizard-steps';

export default async function CreateTripPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/');
  }

  const [profile, plannerProfile, savedDraft] = await Promise.all([
    getUserProfile(session.user.id),
    getPlannerProfile(session.user.id),
    getComposerDraft(session.user.id),
  ]);

  const initialStep = savedDraft?.currentStep
    ? normalizeWizardStep(savedDraft.currentStep)
    : 'landing';

  return (
    <TripComposer
      profileCity={profile?.address_city}
      profileCountry={profile?.country}
      initialPlannerProfile={plannerProfile ?? savedDraft?.plannerProfile ?? null}
      initialDraft={savedDraft?.draft ?? null}
      initialStep={initialStep}
    />
  );
}