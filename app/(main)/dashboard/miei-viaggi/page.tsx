import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { fetchCreatedTrips, fetchJoinedTrips } from '@/lib/data/trips';
import { getComposerDraft } from '@/lib/data/planner-profile';
import { isMeaningfulComposerDraft } from '@/lib/composer/draft-utils';
import { TripManagementCard } from '@/components/trips/TripManagementCard';
import { ComposerDraftCard } from '@/components/composer/ComposerDraftCard';
import Link from 'next/link';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { Button } from '@/components/ui/button';
import { Compass, Plus, Palmtree } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MyTripsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  const userId = session.user.id;

  const [createdTrips, joinedTrips, composerDraft] = await Promise.all([
    fetchCreatedTrips(userId),
    fetchJoinedTrips(userId),
    getComposerDraft(userId),
  ]);

  const hasDraft =
    composerDraft && isMeaningfulComposerDraft(composerDraft.draft);

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <HeroBackground
        images={[BRAND_IMAGES.heroes.slideshow[1], BRAND_IMAGES.heroes.slideshow[3]]}
        overlay="gradient"
      />

      <div className="relative z-0 container mx-auto px-4 py-10 pb-24 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <p className="text-accent font-medium text-sm uppercase tracking-widest mb-2">
              Il tuo hub viaggi
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-white">
              I miei viaggi
            </h1>
            <p className="mt-3 text-white/70 max-w-lg">
              Qui vedi cosa organizzi tu e dove sei in modalità relax — niente più thread WhatsApp
              persi.
            </p>
          </div>
          <Button asChild className="rounded-full shrink-0 gap-2">
            <Link href="/dashboard/crea">
              <Plus className="h-4 w-4" />
              Nuovo viaggio
            </Link>
          </Button>
        </div>

        {hasDraft && (
          <section className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">📝</span>
              <div>
                <h2 className="font-display text-2xl font-semibold text-white">Bozze</h2>
                <p className="text-sm text-white/60">
                  Viaggi non ancora pubblicati — riprendi da dove avevi lasciato.
                </p>
              </div>
            </div>
            <ComposerDraftCard
              draft={composerDraft!.draft}
              currentStep={composerDraft!.currentStep}
              updatedAt={composerDraft!.updatedAt}
            />
          </section>
        )}

        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🧭</span>
            <div>
              <h2 className="font-display text-2xl font-semibold text-white">Organizzo io</h2>
              <p className="text-sm text-white/60">
                Tu guidi piani, prezzi e inviti — la crew si limita a dire &quot;ci sto&quot;.
              </p>
            </div>
          </div>

          {createdTrips.length > 0 ? (
            <div className="space-y-4">
              {createdTrips.map((trip) => (
                <TripManagementCard key={trip.id} trip={trip} variant="organizing" />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/25 bg-white/5 backdrop-blur-sm p-10 text-center">
              <Compass className="h-10 w-10 text-accent mx-auto mb-4" />
              <p className="text-white font-medium">Nessun viaggio organizzato ancora</p>
              <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto">
                Crea il primo, attiva il radar prezzi e manda il link agli amici svogliati.
              </p>
              <Button asChild className="mt-6 rounded-full">
                <Link href="/dashboard/crea">Organizza il primo viaggio</Link>
              </Button>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🏖️</span>
            <div>
              <h2 className="font-display text-2xl font-semibold text-white">Modalità relax</h2>
              <p className="text-sm text-white/60">
                Viaggi a cui ti sei unito senza dover pianificare nulla.
              </p>
            </div>
          </div>

          {joinedTrips.length > 0 ? (
            <div className="space-y-4">
              {joinedTrips.map((trip) => (
                <TripManagementCard key={trip.id} trip={trip} variant="relax" />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/25 bg-white/5 backdrop-blur-sm p-10 text-center">
              <Palmtree className="h-10 w-10 text-accent mx-auto mb-4" />
              <p className="text-white font-medium">Nessun viaggio in modalità relax</p>
              <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto">
                Quando un amico organizza qualcosa, unisciti con un click — zero Excel richiesto.
              </p>
              <Button asChild variant="secondary" className="mt-6 rounded-full">
                <Link href="/dashboard">Scopri viaggi</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}