'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Users, MapPin, LogIn, Palmtree, ArrowRight } from 'lucide-react';
import { useTransition, useState, useEffect } from 'react';
import { toggleFavorite } from '@/actions/favorites';
import { requestToJoinTrip } from '@/actions/trip-join-requests';
import { useRouter } from 'next/navigation';
import { type Session } from 'next-auth';
import { toast } from 'sonner';
import type { TripWithRelations } from '@/types/trip';
import { formatTripDate } from '@/lib/utils/trip';
import { getInitialsFromNames } from '@/lib/utils/user';
import { DEFAULT_TRIP_IMAGE } from '@/lib/brand/images';
import {
  PLANNING_MODE_META,
  formatSpotsLabel,
  isTripFull,
  isTripCreator,
  isTripParticipant,
  canJoinTrip,
} from '@/lib/trips/display';
import { isPhoneGateError, PhoneVerifyGate } from '@/components/auth/PhoneVerifyGate';

export type { TripWithRelations } from '@/types/trip';

type TripCardProps = {
  trip: TripWithRelations;
  session: Session | null;
  /** Evidenzia il CTA partecipazione (Scopri viaggi) */
  discover?: boolean;
};

export function TripCard({ trip, session, discover = false }: TripCardProps) {
  const router = useRouter();
  const [favPending, startFavTransition] = useTransition();
  const [joinPending, startJoinTransition] = useTransition();
  const [optimisticFavorited, setOptimisticFavorited] = useState(trip.isFavorited);
  const [optimisticJoined, setOptimisticJoined] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [phoneGateOpen, setPhoneGateOpen] = useState(false);

  const userId = session?.user?.id;

  useEffect(() => {
    setOptimisticFavorited(trip.isFavorited);
  }, [trip.isFavorited]);

  useEffect(() => {
    setOptimisticJoined(false);
    setRequestSent(false);
  }, [trip.id, trip.trip_participants]);

  const planningMode = trip.planningMode ?? 'group';
  const modeMeta = PLANNING_MODE_META[planningMode];
  const participantCount = trip.participantCount ?? 0;
  const spotsLabel = formatSpotsLabel(trip.maxParticipants, participantCount);
  const full = isTripFull(trip.maxParticipants, participantCount);

  const creator = isTripCreator(trip, userId);
  const participant = isTripParticipant(trip, userId) || optimisticJoined;
  const joinable = canJoinTrip(trip, userId) && !optimisticJoined && !requestSent;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      router.push('/');
      return;
    }
    setOptimisticFavorited(!optimisticFavorited);
    startFavTransition(async () => {
      try {
        await toggleFavorite(trip.id);
        router.refresh();
      } catch (error) {
        console.error(error);
        setOptimisticFavorited(trip.isFavorited);
        toast.error('Impossibile aggiornare i preferiti');
      }
    });
  };

  const doJoin = async () => {
    const result = await requestToJoinTrip(trip.id);
    if (!result.ok) {
      if (result.code === 'PHONE_VERIFY_REQUIRED' || isPhoneGateError(result.error)) {
        setPhoneGateOpen(true);
        return;
      }
      toast.error(result.error);
      return;
    }
    if (result.status === 'already_member') {
      setOptimisticJoined(true);
      toast.success('Sei già nella crew di questo viaggio');
    } else {
      setRequestSent(true);
      toast.success(
        result.status === 'already_pending'
          ? 'Richiesta già inviata: aspetta la risposta dell’organizzatore'
          : 'Richiesta inviata! L’organizzatore deve accettarla 🤞'
      );
    }
    router.refresh();
  };

  const handleJoinClick = () => {
    if (!session) {
      router.push('/');
      return;
    }
    startJoinTransition(() => doJoin());
  };

  const imageUrl = trip.imageUrl || DEFAULT_TRIP_IMAGE;
  const tripHref = `/viaggi/${trip.id}`;

  return (
    <div className="h-full">
      <PhoneVerifyGate
        open={phoneGateOpen}
        onOpenChange={setPhoneGateOpen}
        onVerified={() => {
          startJoinTransition(() => doJoin());
        }}
      />
      <Card className="card-travel h-full group flex flex-col bg-card border-0 shadow-xl">
        <div className="relative h-60 w-full shrink-0">
          <Link href={tripHref} className="block h-full w-full overflow-hidden">
            <Image
              src={imageUrl}
              alt={`Viaggio: ${trip.title}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
            <Badge className="bg-black/50 text-white border-white/20 backdrop-blur-sm text-[10px]">
              {modeMeta.emoji} {modeMeta.shortLabel}
            </Badge>
            <Badge
              variant={full ? 'destructive' : 'secondary'}
              className="bg-black/50 text-white border-white/20 backdrop-blur-sm text-[10px]"
            >
              {spotsLabel}
            </Badge>
            {participant && !creator && (
              <Badge className="bg-emerald-600/90 text-white border-0 backdrop-blur-sm text-[10px]">
                🏖️ Relax
              </Badge>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <Badge className="mb-2 bg-accent/90 hover:bg-accent text-accent-foreground border-0 text-xs font-medium">
              <MapPin className="mr-1 h-3 w-3" />
              {trip.destination}
            </Badge>
            <h3 className="font-display text-xl font-semibold text-white line-clamp-2 leading-snug">
              {trip.title}
            </h3>
          </div>
          </Link>

          {session?.user && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-md"
              onClick={handleFavoriteClick}
              disabled={favPending}
            >
              <Heart
                className={`h-4 w-4 transition-all ${
                  optimisticFavorited ? 'text-red-500 fill-red-500' : 'text-slate-600'
                }`}
              />
            </Button>
          )}
        </div>

        <CardContent className="p-4 flex flex-col flex-grow gap-3">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {modeMeta.description}
          </p>

          <div className="mt-auto space-y-2.5 pt-3 border-t border-border/60">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium tabular-nums">
                {formatTripDate(trip.startDate)} – {formatTripDate(trip.endDate)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {participantCount}/{trip.maxParticipants} in crew
              </span>
              <span className="text-xs">da {trip.price}€/persona</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-4 py-3 bg-muted/40 border-t border-border/50 flex-col gap-3">
          <div className="flex items-center justify-between w-full gap-2">
            {trip.creator ? (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-7 w-7 ring-2 ring-background">
                  <AvatarImage src={trip.creator.image ?? ''} />
                  <AvatarFallback className="text-[10px]">
                    {getInitialsFromNames(trip.creator.first_name, trip.creator.last_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  🧭 {trip.creator.first_name} organizza
                </span>
              </div>
            ) : (
              <div />
            )}
            {!discover && (
              <>
                {joinable && (
                  <Button
                    size="sm"
                    className="rounded-full shrink-0"
                    onClick={handleJoinClick}
                    disabled={joinPending}
                  >
                    {joinPending ? 'Invio...' : (
                      <>
                        <LogIn className="mr-1.5 h-3.5 w-3.5" />
                        Ci sto! 🏖️
                      </>
                    )}
                  </Button>
                )}
                {requestSent && !participant && (
                  <Badge variant="secondary" className="rounded-full text-[10px] shrink-0">
                    ⏳ Richiesta inviata
                  </Badge>
                )}
                {participant && !creator && (
                  <Badge variant="secondary" className="rounded-full text-[10px] shrink-0">
                    🏖️ Sei dentro
                  </Badge>
                )}
              </>
            )}
          </div>

          {discover && (
            <div className="w-full">
              {participant && !creator ? (
                <Button asChild className="w-full rounded-full gap-2" variant="secondary">
                  <Link href={tripHref}>
                    <Palmtree className="h-4 w-4" />
                    Vai al viaggio — modalità relax
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Link>
                </Button>
              ) : requestSent ? (
                <Button className="w-full rounded-full" variant="outline" disabled>
                  ⏳ Richiesta inviata — attendi l’organizzatore
                </Button>
              ) : joinable ? (
                <Button
                  className="w-full rounded-full gap-2"
                  onClick={handleJoinClick}
                  disabled={joinPending}
                >
                  {joinPending ? (
                    'Invio richiesta...'
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Chiedi di unirti — modalità relax 🏖️
                    </>
                  )}
                </Button>
              ) : !session?.user ? (
                <Button asChild className="w-full rounded-full gap-2" variant="outline">
                  <Link href="/">
                    <LogIn className="h-4 w-4" />
                    Accedi per partecipare
                  </Link>
                </Button>
              ) : full ? (
                <Button className="w-full rounded-full" variant="outline" disabled>
                  Viaggio al completo
                </Button>
              ) : creator ? null : null}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}