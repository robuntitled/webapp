import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { fetchComposerItinerary } from '@/lib/data/composer';
import { fetchTripById } from '@/lib/data/trips';
import { TripExperienceHub } from '@/components/trips/TripExperienceHub';
import { DEFAULT_TRIP_IMAGE } from '@/lib/brand/images';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TripDetailActions } from '@/components/trips/TripDetailActions';
import { TripShareBar } from '@/components/trips/TripShareBar';
import { TripCrewPeek } from '@/components/trips/TripCrewPeek';
import { TripRoleBadge } from '@/components/trips/TripRoleBadge';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import { resolveUserTripRole } from '@/lib/trips/roles';
import type { TripParticipantRole } from '@/lib/trips/roles';
import { formatTripDate, formatAgeRange, getTripStatus } from '@/lib/utils/trip';
import { CakeSlice, CalendarDays, MapPin, Users, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TripDetailPage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;
  const trip = await fetchTripById(id, session?.user?.id);

  if (!trip) {
    notFound();
  }

  const imageUrl = trip.imageUrl || DEFAULT_TRIP_IMAGE;
  const status = getTripStatus(trip.startDate, trip.endDate);
  const isCreator = session?.user?.id === trip.creator?.id;
  const participant = trip.trip_participants?.find((p) => p.user_id === session?.user?.id);
  const isParticipant = !!participant;
  const userRole = resolveUserTripRole(
    session?.user?.id,
    trip.creator?.id,
    participant?.role as TripParticipantRole | undefined
  );
  const showInvite = isCreator || userRole === 'owner' || userRole === 'editor';
  const composerItinerary =
    (trip.composerVersion ?? 0) >= 1 ? await fetchComposerItinerary(trip.id) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[50vh] min-h-[320px] max-h-[560px] w-full">
        <Image src={imageUrl} alt={trip.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/20" />
        <div className="absolute top-20 left-0 right-0 container mx-auto px-4">
          <Button
            asChild
            variant="ghost"
            className="text-white/90 hover:text-white hover:bg-white/10 rounded-full"
          >
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alla ricerca
            </Link>
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge
              variant={status.variant}
              className="bg-white/15 text-white border-white/20 backdrop-blur-sm"
            >
              {status.text}
            </Badge>
            <Badge className="bg-white/15 text-white border-white/20 backdrop-blur-sm">
              {trip.planningMode === 'solo' ? '🧳 Solo (aperto al gruppo)' : '🎉 Con gli amici'}
            </Badge>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white max-w-4xl leading-tight">
                {trip.title}
              </h1>
              <p className="mt-3 flex items-center text-lg text-white/80">
                <MapPin className="mr-2 h-5 w-5 text-accent shrink-0" />
                {trip.destination}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <TripShareBar
                tripId={trip.id}
                tripTitle={trip.title}
                canInvite={showInvite && Boolean(session?.user?.id)}
                tone="onDark"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-6xl -mt-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            <TripExperienceHub
              destination={trip.destination}
              description={trip.description}
              composerItinerary={composerItinerary}
            />
          </div>

          <div className="lg:col-span-5 space-y-6">
            <Card className="rounded-2xl border-0 shadow-lg lg:sticky lg:top-24">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-baseline justify-between pb-4 border-b">
                  <span className="text-muted-foreground text-sm">Prezzo a persona</span>
                  <span className="text-4xl font-bold text-primary tabular-nums">{trip.price}€</span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                    {formatTripDate(trip.startDate)} – {formatTripDate(trip.endDate)}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    {trip.minParticipants}–{trip.maxParticipants} partecipanti
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <CakeSlice className="h-4 w-4 text-primary shrink-0" />
                    {formatAgeRange(trip.minAge, trip.maxAge)}
                  </div>
                </div>

                {trip.creator && (
                  <div className="pt-5 border-t space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Organizzato da
                      </p>
                      <UserProfileLink
                        userId={trip.creator.id}
                        username={trip.creator.username}
                        firstName={trip.creator.first_name}
                        lastName={trip.creator.last_name}
                        image={trip.creator.image}
                        mode="both"
                        size="md"
                        className="w-full rounded-xl border bg-muted/20 px-3 py-2.5 hover:bg-muted/40"
                        subtitle="Vedi profilo pubblico"
                      />
                    </div>
                    <TripCrewPeek
                      participants={trip.trip_participants}
                      creatorId={trip.creator.id}
                      revealed={isCreator || isParticipant}
                    />
                  </div>
                )}

                {userRole && (
                  <div className="flex justify-center pb-1">
                    <TripRoleBadge role={userRole} />
                  </div>
                )}

                <TripDetailActions
                  tripId={trip.id}
                  session={session}
                  isCreator={isCreator}
                  isParticipant={isParticipant}
                  isFavorited={trip.isFavorited}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
