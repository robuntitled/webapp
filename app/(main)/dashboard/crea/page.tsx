import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TripComposer } from '@/components/composer/TripComposer';
import { getComposerDraft, getPlannerProfile } from '@/lib/data/planner-profile';
import { getUserProfile } from '@/lib/data/users';

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

  const hasCompletePlanner =
    plannerProfile &&
    plannerProfile.interests.length > 0 &&
    savedDraft?.currentStep !== 'intake';

  return (
    <TripComposer
      profileCity={profile?.address_city}
      profileCountry={profile?.country}
      initialPlannerProfile={plannerProfile ?? savedDraft?.plannerProfile ?? null}
      initialDraft={savedDraft?.draft ?? null}
      initialStep={
        hasCompletePlanner
          ? savedDraft?.currentStep ?? 'setup'
          : plannerProfile
            ? 'setup'
            : 'intake'
      }
    />
  );
}