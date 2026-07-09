import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { fetchTripById } from '@/lib/data/trips';
import { DEFAULT_TRIP_IMAGE } from '@/lib/brand/images';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TripBookingSection } from '@/components/travel/TripBookingSection';
import { PriceWatchPanel } from '@/components/trips/PriceWatchPanel';
import { TripDetailActions } from '@/components/trips/TripDetailActions';
import { TripCrewCard } from '@/components/trips/TripCrewCard';
import { TripInviteCard } from '@/components/trips/TripInviteCard';
import { TripRoleBadge } from '@/components/trips/TripRoleBadge';
import { resolveUserTripRole } from '@/lib/trips/roles';
import type { TripParticipantRole } from '@/lib/trips/roles';
import { formatTripDate, formatAgeRange, getTripStatus } from '@/lib/utils/trip';
import { getInitialsFromNames } from '@/lib/utils/user';
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
  const canManagePrices = userRole === 'owner' || userRole === 'editor';
  const showInvite = isCreator || userRole === 'owner' || userRole === 'editor';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero full-bleed */}
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
          <Badge
            variant={status.variant}
            className="mb-4 bg-white/15 text-white border-white/20 backdrop-blur-sm"
          >
            {status.text}
          </Badge>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white max-w-4xl leading-tight">
            {trip.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-lg text-white/80">
            <p className="flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-accent" />
              {trip.destination}
            </p>
            <Badge className="bg-white/15 text-white border-white/20 backdrop-blur-sm">
              {trip.planningMode === 'solo' ? '🧳 Solo (aperto al gruppo)' : '🎉 Con gli amici'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-5xl -mt-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="rounded-2xl border-0 shadow-lg">
              <CardContent className="p-8">
                <h2 className="font-display text-2xl font-semibold mb-4">L&apos;esperienza</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-base">
                  {trip.description}
                </p>
              </CardContent>
            </Card>

            <PriceWatchPanel tripId={trip.id} canManage={canManagePrices} />

            <TripCrewCard
              planningMode={trip.planningMode}
              participants={trip.trip_participants}
              creatorId={trip.creator?.id}
            />

            {showInvite && <TripInviteCard tripId={trip.id} tripTitle={trip.title} />}
          </div>

          <div className="lg:col-span-1">
            <Card className="rounded-2xl border-0 shadow-lg sticky top-24">
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
                  <div className="flex items-center gap-3 pt-5 border-t">
                    <Avatar className="h-11 w-11 ring-2 ring-muted">
                      <AvatarImage src={trip.creator.image ?? ''} />
                      <AvatarFallback>
                        {getInitialsFromNames(trip.creator.first_name, trip.creator.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Organizzato da
                      </p>
                      <p className="font-medium">
                        {trip.creator.first_name} {trip.creator.last_name}
                      </p>
                    </div>
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

                <TripBookingSection
                  tripId={trip.id}
                  destination={trip.destination}
                  startDate={trip.startDate}
                  endDate={trip.endDate}
                  maxParticipants={trip.maxParticipants}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}