'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MapPin, CalendarDays, X, LogIn } from 'lucide-react';
import { type TripWithRelations } from './TripCard';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTransition } from 'react';
import { toggleFavorite } from '../../actions/favorites';
import { joinTrip } from '../../actions/trip-management';
import { useRouter } from 'next/navigation';
import { type Session } from 'next-auth';

const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.substring(0, 2).toUpperCase();
  return 'U';
};

const getTripStatus = (startDate: string, endDate: string): { text: string, variant: "default" | "secondary" | "destructive" | "outline" } => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (now > end) return { text: "Concluso", variant: "secondary" };
  if (now >= start && now <= end) return { text: "In Corso", variant: "destructive" };
  return { text: "Prossimamente", variant: "default" };
};

// Il componente ora accetta anche la sessione per la logica del pulsante "Unisciti"
export function FavoriteTripCard({ trip, session }: { trip: TripWithRelations, session: Session | null }) {
  const router = useRouter();
  const [isRemoving, startRemoving] = useTransition();
  const [isJoining, startJoining] = useTransition();
  
  const imageUrl = trip.imageUrl || '/images/placeholder-viaggio.jpg';
  const status = getTripStatus(trip.startDate, trip.endDate);
  const creatorFullName = `${trip.creator?.first_name || ''} ${trip.creator?.last_name || ''}`.trim();

  const handleRemoveFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startRemoving(async () => {
      try {
        await toggleFavorite(trip.id);
        router.refresh(); 
      } catch (error) {
        console.error("Fallimento rimozione preferito:", error);
        alert("Impossibile rimuovere il preferito.");
      }
    });
  };

  const handleJoinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) { router.push('/'); return; }
    startJoining(async () => {
      try {
        await joinTrip(trip.id);
        alert('Ti sei unito al viaggio con successo!');
        router.refresh();
      } catch (error: any) {
        alert(`Errore: ${error.message}`);
      }
    });
  };

  // Verifichiamo se l'utente è già partecipante
  // @ts-ignore: trip.trip_participants non è nel tipo base ma arriva dalla query
  const isParticipant = trip.trip_participants?.some(p => p.user_id === session?.user?.id);

  return (
    <Card className="w-full transition-all hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-40 sm:h-auto sm:w-48 flex-shrink-0">
          <Link href={`/viaggi/${trip.id}`}><Image src={imageUrl} alt={`Immagine del viaggio ${trip.title}`} fill style={{ objectFit: "cover" }} className="rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none"/></Link>
        </div>
        
        <div className="p-4 flex-grow flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <Badge variant={status.variant}>{status.text}</Badge>
                    <Button variant="ghost" size="icon" onClick={handleRemoveFavorite} disabled={isRemoving} aria-label="Rimuovi dai preferiti" className="h-8 w-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                        <X className="h-5 w-5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500" />
                    </Button>
                </div>
                <Link href={`/viaggi/${trip.id}`} className="hover:no-underline">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 line-clamp-1 hover:text-blue-600 mt-1">{trip.title}</h3>
                </Link>
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
                    <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0" />
                    <span>{trip.destination}</span>
                </div>
            </div>

            <div className="flex items-end justify-between mt-4">
                <div className="flex items-center space-x-2">
                    {trip.creator ? (<><Avatar className="h-6 w-6"><AvatarImage src={trip.creator.image ?? ''} /><AvatarFallback>{getInitials(trip.creator.first_name, trip.creator.last_name)}</AvatarFallback></Avatar><span className="text-xs text-slate-500 dark:text-slate-400">Creato da {trip.creator.first_name}</span></>) : <div className="h-6" />}
                </div>

                {/* Logica per mostrare il pulsante "Unisciti" o lo stato di partecipazione */}
                {session?.user?.id && session.user.id !== trip.creator?.id && (
                  <>
                    {isParticipant ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">Partecipi</Badge>
                    ) : (
                      <Button size="sm" onClick={handleJoinClick} disabled={isJoining}>
                        {isJoining ? 'Mi unisco...' : <><LogIn className="mr-2 h-4 w-4" /> Unisciti</>}
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