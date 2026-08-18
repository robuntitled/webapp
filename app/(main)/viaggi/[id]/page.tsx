import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { fetchComposerItinerary } from '@/lib/data/composer';
import { fetchTripById } from '@/lib/data/trips';
import { TripExperienceHub } from '@/components/trips/TripExperienceHub';
import { TripBookingHub } from '@/components/trips/TripBookingHub';
import { DEFAULT_TRIP_IMAGE } from '@/lib/brand/images';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TripDetailActions } from '@/components/trips/TripDetailActions';
import { TripShareBar } from '@/components/trips/TripShareBar';
import { TripCrewPeek } from '@/components/trips/TripCrewPeek';
import { TripJoinRequestsInbox } from '@/components/trips/TripJoinRequestsInbox';
import {
  getJoinRequestStatus,
  listPendingJoinRequestsForTrip,
} from '@/lib/data/trip-join-requests';
import { TripRoleBadge } from '@/components/trips/TripRoleBadge';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import { resolveUserTripRole } from '@/lib/trips/roles';
import type { TripParticipantRole } from '@/lib/trips/roles';
import { formatTripDate, formatAgeRange, getTripStatus } from '@/lib/utils/trip';
import { CakeSlice, CalendarDays, MapPin, Users, ArrowLeft } from 'lucide-react';
import {
  canBookTripServices,
  departureGuaranteeCopy,
  formationLabel,
  isClosingSoon,
  joinDeadlineLabel,
  lastJoinLabel,
} from '@/lib/trips/formation';
import { getPublicProfile } from '@/lib/data/public-profile';
import { COMPLIANCE_COPY } from '@/lib/legal/compliance-copy';
import {
  estimateParticipantCashbackEur,
  formatCreatorCashback,
  formatParticipantCashback,
} from '@/lib/commerce/cashback';

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
  const canBook = canBookTripServices(trip);
  const closingSoon = isClosingSoon(trip);
  const estimatedCashback = estimateParticipantCashbackEur(Number(trip.price) || 0);
  const lockReason = departureGuaranteeCopy(trip);
  const recentJoin = lastJoinLabel(trip);
  const deadline = joinDeadlineLabel(trip);
  const isCreator = session?.user?.id === trip.creator?.id;
  const participant = trip.trip_participants?.find((p) => p.user_id === session?.user?.id);
  const isParticipant = !!participant;
  const userRole = resolveUserTripRole(
    session?.user?.id,
    trip.creator?.id,
    participant?.role as TripParticipantRole | undefined
  );
  const showInvite = isCreator || userRole === 'owner' || userRole === 'editor';
  const canManageRequests = showInvite;
  const composerItinerary =
    (trip.composerVersion ?? 0) >= 1 ? await fetchComposerItinerary(trip.id) : null;

  const [joinRequests, myJoinRequestStatus, creatorProfile] = await Promise.all([
    canManageRequests ? listPendingJoinRequestsForTrip(trip.id) : Promise.resolve([]),
    session?.user?.id && !isCreator && !isParticipant
      ? getJoinRequestStatus(trip.id, session.user.id)
      : Promise.resolve(null),
    trip.creator ? getPublicProfile(trip.creator.id) : Promise.resolve(null),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[32vh] min-h-[220px] max-h-[300px] w-full">
        <Image src={imageUrl} alt={trip.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/20" />
        <div className="absolute top-20 left-0 right-0 container mx-auto max-w-5xl px-4">
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
        <div className="absolute bottom-0 left-0 right-0 container mx-auto max-w-5xl px-4 pb-6">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Badge
              variant={status.variant}
              className="bg-white/15 text-white border-white/20 backdrop-blur-sm"
            >
              {status.text}
            </Badge>
            <Badge className="bg-white/15 text-white border-white/20 backdrop-blur-sm">
              {formationLabel(trip)}
            </Badge>
            {closingSoon ? (
              <Badge className="bg-amber-500/90 text-white border-0">In chiusura</Badge>
            ) : null}
            <Badge className="bg-white/15 text-white border-white/20 backdrop-blur-sm">
              {trip.planningMode === 'solo' ? '🧳 Solo (aperto al gruppo)' : '🎉 Con gli amici'}
            </Badge>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 text-center sm:text-left">
              <h1 className="font-display text-3xl font-semibold text-white max-w-4xl leading-tight md:text-4xl">
                {trip.title}
              </h1>
              <p className="mt-2 flex items-center justify-center text-base text-white/80 sm:justify-start">
                <MapPin className="mr-2 h-5 w-5 text-accent shrink-0" />
                {trip.destination}
              </p>
            </div>
            <div className="shrink-0 flex items-center justify-center gap-2 sm:justify-end">
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

      <div className="container mx-auto max-w-5xl px-4 py-8 -mt-5 relative z-10 space-y-8">
        <TripBookingHub
          tripId={trip.id}
          destination={trip.destination}
          startDate={
            typeof trip.startDate === 'string'
              ? trip.startDate.slice(0, 10)
              : new Date(trip.startDate).toISOString().slice(0, 10)
          }
          endDate={
            typeof trip.endDate === 'string'
              ? trip.endDate.slice(0, 10)
              : new Date(trip.endDate).toISOString().slice(0, 10)
          }
          adults={Math.min(9, Math.max(1, trip.maxParticipants ?? 2))}
          isAuthenticated={Boolean(session?.user?.id)}
          bookerEmail={session?.user?.email ?? ''}
          bookerName={session?.user?.name ?? ''}
          composerItinerary={composerItinerary}
          canBook={canBook}
          lockReason={
            canBook
              ? undefined
              : 'Prenoti voli, hotel e attrazioni solo quando il gruppo è solido.'
          }
        />

        <TripExperienceHub
          destination={trip.destination}
          description={trip.description}
          composerItinerary={composerItinerary}
        />

        <Card className="overflow-hidden rounded-[1.75rem] border border-border/50 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)]">
          <CardContent className="space-y-5 p-6">
            <div className="border-b border-border/40 pb-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Stima servizi a persona
                </span>
                <span className="font-display text-4xl font-semibold tabular-nums tracking-tight text-primary">
                  ~{trip.price}€
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {COMPLIANCE_COPY.priceIsSumOfServices}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0 text-accent" />
                {formatTripDate(trip.startDate)} – {formatTripDate(trip.endDate)}
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0 text-accent" />
                {trip.minParticipants}–{trip.maxParticipants} partecipanti
              </div>
              <p className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {lockReason}
              </p>
              {recentJoin ? (
                <p className="text-xs font-medium text-foreground">{recentJoin}</p>
              ) : null}
              {deadline ? (
                <p className="text-xs font-medium text-foreground">{deadline}</p>
              ) : null}
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Cashback stimato</span>
                <span className="font-medium tabular-nums">
                  {estimatedCashback > 0 ? `~${estimatedCashback}€` : formatParticipantCashback()}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Creator {formatCreatorCashback()} · partecipante {formatParticipantCashback()}
              </p>
              <div className="flex items-center gap-3 text-muted-foreground">
                <CakeSlice className="h-4 w-4 shrink-0 text-accent" />
                {formatAgeRange(trip.minAge, trip.maxAge)}
              </div>
            </div>

            {trip.creator && (
              <div className="space-y-4 border-t border-border/40 pt-5">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Creato da
                  </p>
                  <UserProfileLink
                    userId={trip.creator.id}
                    username={trip.creator.username}
                    firstName={trip.creator.first_name}
                    lastName={trip.creator.last_name}
                    image={trip.creator.image}
                    mode="both"
                    size="md"
                    className="w-full rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 hover:bg-muted/40"
                    subtitle={
                      creatorProfile?.ratingAvg
                        ? `${creatorProfile.ratingAvg}/5 · ${creatorProfile.ratingCount} recensioni`
                        : 'Vedi profilo pubblico'
                    }
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
              joinRequestStatus={myJoinRequestStatus}
            />
          </CardContent>
        </Card>

        {canManageRequests && joinRequests.length > 0 && (
          <Card className="rounded-[1.75rem] border border-border/50">
            <CardContent className="p-6">
              <TripJoinRequestsInbox requests={joinRequests} showTripTitle={false} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
