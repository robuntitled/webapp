'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Users, MapPin, LogIn } from 'lucide-react';
import { useTransition, useState, useEffect } from 'react';
import { toggleFavorite } from '@/actions/favorites';
import { joinTrip } from '@/actions/trip-management';
import { useRouter } from 'next/navigation';
import { type Session } from 'next-auth';
import { toast } from 'sonner';
import type { TripWithRelations } from '@/types/trip';
import { formatTripDate } from '@/lib/utils/trip';
import { getInitialsFromNames } from '@/lib/utils/user';
import { DEFAULT_TRIP_IMAGE } from '@/lib/brand/images';
import { PLANNING_MODE_META, formatSpotsLabel, isTripFull } from '@/lib/trips/display';

export type { TripWithRelations } from '@/types/trip';

export function TripCard({
  trip,
  session,
}: {
  trip: TripWithRelations;
  session: Session | null;
}) {
  const router = useRouter();
  const [favPending, startFavTransition] = useTransition();
  const [joinPending, startJoinTransition] = useTransition();
  const [optimisticFavorited, setOptimisticFavorited] = useState(trip.isFavorited);

  useEffect(() => {
    setOptimisticFavorited(trip.isFavorited);
  }, [trip.isFavorited]);

  const planningMode = trip.planningMode ?? 'group';
  const modeMeta = PLANNING_MODE_META[planningMode];
  const participantCount = trip.participantCount ?? 0;
  const spotsLabel = formatSpotsLabel(trip.maxParticipants, participantCount);
  const full = isTripFull(trip.maxParticipants, participantCount);

  const isCreator = session?.user?.id === trip.creator?.id;
  const isParticipant = trip.trip_participants?.some((p) => p.user_id === session?.user?.id) ?? false;
  const canJoin = session?.user && !isCreator && !isParticipant && !full;

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

  const handleJoinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      router.push('/');
      return;
    }
    startJoinTransition(async () => {
      try {
        await joinTrip(trip.id);
        toast.success('Sei dentro! Modalità relax attiva 🏖️');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Errore imprevisto');
      }
    });
  };

  const imageUrl = trip.imageUrl || DEFAULT_TRIP_IMAGE;

  return (
    <div className="h-full">
      <Card className="card-travel h-full group flex flex-col bg-card relative border-0 shadow-xl">
        <div className="relative h-60 w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={`Viaggio: ${trip.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

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

          <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
            <Badge className="bg-black/50 text-white border-white/20 backdrop-blur-sm text-[10px]">
              {modeMeta.emoji} {modeMeta.shortLabel}
            </Badge>
            <Badge
              variant={full ? 'destructive' : 'secondary'}
              className="bg-black/50 text-white border-white/20 backdrop-blur-sm text-[10px]"
            >
              {spotsLabel}
            </Badge>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <Badge className="mb-2 bg-accent/90 hover:bg-accent text-accent-foreground border-0 text-xs font-medium">
              <MapPin className="mr-1 h-3 w-3" />
              {trip.destination}
            </Badge>
            <h3 className="font-display text-xl font-semibold text-white line-clamp-2 leading-snug">
              {trip.title}
            </h3>
          </div>
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

        <CardFooter className="relative z-20 px-4 py-3 bg-muted/40 border-t border-border/50">
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
            {canJoin && (
              <Button
                size="sm"
                className="relative z-20 rounded-full shrink-0"
                onClick={handleJoinClick}
                disabled={joinPending}
              >
                {joinPending ? (
                  'Entro...'
                ) : (
                  <>
                    <LogIn className="mr-1.5 h-3.5 w-3.5" />
                    Ci sto! 🏖️
                  </>
                )}
              </Button>
            )}
            {isParticipant && !isCreator && (
              <Badge variant="secondary" className="rounded-full text-[10px] shrink-0">
                🏖️ Sei dentro
              </Badge>
            )}
          </div>
        </CardFooter>

        <Link href={`/viaggi/${trip.id}`} className="absolute inset-0 z-[5]" aria-label={`Vedi ${trip.title}`}>
          <span className="sr-only">Vedi dettagli</span>
        </Link>
      </Card>
    </div>
  );
}