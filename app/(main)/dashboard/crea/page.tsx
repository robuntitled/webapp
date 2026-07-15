import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TripComposer } from '@/components/composer/TripComposer';
import { getComposerDraft, getPlannerProfile } from '@/lib/data/planner-profile';
import { getUserProfile } from '@/lib/data/users';
import { isMeaningfulComposerDraft } from '@/lib/composer/draft-utils';

type CreateTripPageProps = {
  searchParams: Promise<{ resume?: string }>;
};

export default async function CreateTripPage({ searchParams }: CreateTripPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect('/');
  }

  const params = await searchParams;
  const resume = params.resume === '1' || params.resume === 'true';

  const [profile, plannerProfile, savedDraft] = await Promise.all([
    getUserProfile(session.user.id),
    getPlannerProfile(session.user.id),
    getComposerDraft(session.user.id),
  ]);

  const canResume = Boolean(
    resume && savedDraft && isMeaningfulComposerDraft(savedDraft.draft)
  );

  return (
    <TripComposer
      profileCity={profile?.address_city}
      profileCountry={profile?.country}
      initialPlannerProfile={
        canResume
          ? (plannerProfile ?? savedDraft?.plannerProfile ?? null)
          : (plannerProfile ?? null)
      }
      initialDraft={canResume ? (savedDraft?.draft ?? null) : null}
      initialStep={canResume ? savedDraft!.currentStep : 'landing'}
      resumeDraft={canResume}
    />
  );
}