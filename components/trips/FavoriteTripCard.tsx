'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MapPin, X, LogIn } from 'lucide-react';
import { useTransition } from 'react';
import { toggleFavorite } from '@/actions/favorites';
import { joinTrip } from '@/actions/trip-management';
import { useRouter } from 'next/navigation';
import { type Session } from 'next-auth';
import { toast } from 'sonner';
import type { TripWithRelations } from '@/types/trip';
import { getTripStatus } from '@/lib/utils/trip';
import { getInitialsFromNames } from '@/lib/utils/user';

export function FavoriteTripCard({
  trip,
  session,
}: {
  trip: TripWithRelations;
  session: Session | null;
}) {
  const router = useRouter();
  const [isRemoving, startRemoving] = useTransition();
  const [isJoining, startJoining] = useTransition();

  const imageUrl = trip.imageUrl || '/images/trips/placeholder.jpg';
  const status = getTripStatus(trip.startDate, trip.endDate);
  const isParticipant = trip.trip_participants?.some(
    (p) => p.user_id === session?.user?.id
  );

  const handleRemoveFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startRemoving(async () => {
      try {
        await toggleFavorite(trip.id);
        router.refresh();
      } catch (error) {
        console.error('Fallimento rimozione preferito:', error);
        toast.error('Impossibile rimuovere il preferito.');
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
    startJoining(async () => {
      try {
        await joinTrip(trip.id);
        toast.success('Ti sei unito al viaggio con successo!');
        router.refresh();
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Errore imprevisto';
        toast.error(msg);
        if (msg.toLowerCase().includes('telefono')) {
          toast.message('Verifica il numero in Impostazioni → Sicurezza', {
            action: {
              label: 'Vai',
              onClick: () => router.push('/dashboard/impostazioni'),
            },
          });
        }
      }
    });
  };

  return (
    <Card className="w-full transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-40 sm:h-auto sm:w-48 flex-shrink-0">
          <Link href={`/viaggi/${trip.id}`}>
            <Image
              src={imageUrl}
              alt={`Immagine del viaggio ${trip.title}`}
              fill
              style={{ objectFit: 'cover' }}
              className="rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none"
            />
          </Link>
        </div>

        <div className="p-4 flex-grow flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <Badge variant={status.variant}>{status.text}</Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFavorite}
                disabled={isRemoving}
                aria-label="Rimuovi dai preferiti"
                className="h-8 w-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500" />
              </Button>
            </div>
            <Link href={`/viaggi/${trip.id}`} className="hover:no-underline">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 line-clamp-1 hover:text-blue-600 mt-1">
                {trip.title}
              </h3>
            </Link>
            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
              <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span>{trip.destination}</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <div className="flex items-center space-x-2">
              {trip.creator ? (
                <>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={trip.creator.image ?? ''} />
                    <AvatarFallback>
                      {getInitialsFromNames(trip.creator.first_name, trip.creator.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Creato da {trip.creator.first_name}
                  </span>
                </>
              ) : (
                <div className="h-6" />
              )}
            </div>

            {session?.user?.id && session.user.id !== trip.creator?.id && (
              <>
                {isParticipant ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Partecipi
                  </Badge>
                ) : (
                  <Button size="sm" onClick={handleJoinClick} disabled={isJoining}>
                    {isJoining ? (
                      'Mi unisco...'
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" /> Unisciti
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}