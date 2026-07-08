'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Users, CakeSlice, MapPin, LogIn } from 'lucide-react';
import { useTransition, useState, useEffect } from 'react';
import { toggleFavorite } from '../../actions/favorites';
import { joinTrip } from '../../actions/trip-management';
import { useRouter } from 'next/navigation';
import { type Session } from 'next-auth';

const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.substring(0, 2).toUpperCase();
  return 'U';
};

type Creator = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image: string | null;
};

export type TripWithRelations = {
  id: string; title: string; destination: string; description: string; imageUrl: string | null; price: number; startDate: string; endDate: string; minParticipants: number; maxParticipants: number; minAge: number; maxAge: number; 
  creator: Creator | null; 
  isFavorited: boolean;
};

export function TripCard({ trip, session }: { trip: TripWithRelations, session: Session | null }) {
  const router = useRouter();
  const [favPending, startFavTransition] = useTransition();
  const [joinPending, startJoinTransition] = useTransition();
  const [optimisticFavorited, setOptimisticFavorited] = useState(trip.isFavorited);

  useEffect(() => { setOptimisticFavorited(trip.isFavorited); }, [trip.isFavorited]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!session) { router.push('/'); return; }
    setOptimisticFavorited(!optimisticFavorited);
    startFavTransition(async () => {
      try { await toggleFavorite(trip.id); router.refresh(); } catch (error) { console.error(error); setOptimisticFavorited(trip.isFavorited); }
    });
  };
  
  const handleJoinClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!session) { router.push('/'); return; }
    startJoinTransition(async () => {
      try { await joinTrip(trip.id); alert('Ti sei unito al viaggio!'); router.refresh(); } catch (error: any) { alert(`Errore: ${error.message}`); }
    });
  };

  const formatDate = (dateString: string) => { if (!dateString) return 'N/D'; return new Date(dateString).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }); };
  const formatAgeRange = (min: number, max: number) => { if (max >= 999) return `${min}+ Anni`; return `${min}-${max} Anni`; };
  const imageUrl = trip.imageUrl || '/images/placeholder-viaggio.jpg';
  
  // --- MODIFICA 1: Questa variabile non ci serve più ---
  // const creatorFullName = `${trip.creator?.first_name || ''} ${trip.creator?.last_name || ''}`.trim();
  
  return (
    <div className="h-full">
      <Card className="h-full overflow-hidden transition-all group flex flex-col bg-white dark:bg-slate-900 relative hover:shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="relative h-56 w-full">
          <Image src={imageUrl} alt={`Immagine del viaggio ${trip.title}`} fill style={{ objectFit: "cover" }} className="transition-transform group-hover:scale-105" />
          {session?.user && <Button size="icon" variant="ghost" className="absolute top-2 right-2 bg-white/70 hover:bg-white rounded-full z-20 h-8 w-8" onClick={handleFavoriteClick} disabled={favPending}><Heart className={`h-4 w-4 transition-all ${optimisticFavorited ? 'text-red-500 fill-current' : 'text-slate-700'}`} /></Button>}
          <div className="absolute bottom-0 left-0 p-3 bg-gradient-to-t from-black/70 to-transparent w-full">
             <h3 className="font-bold text-xl text-white drop-shadow-lg line-clamp-2">{trip.title}</h3>
             <Badge variant="secondary" className="mt-1 inline-flex items-center"><MapPin className="mr-1 h-3 w-3"/>{trip.destination}</Badge>
          </div>
        </div>
        <CardContent className="p-3 flex flex-col flex-grow">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{trip.description}</p>
          <div className="mt-auto pt-3 border-t space-y-3">
            <div className="flex justify-between items-center text-sm font-medium text-slate-800 dark:text-slate-200"><span>Date:</span><span>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span></div>
            <div className="flex justify-between items-center text-sm"><div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400"><Users className="h-4 w-4" /><span>{trip.minParticipants}-{trip.maxParticipants} Pers.</span></div><div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400"><CakeSlice className="h-4 w-4" /><span>{formatAgeRange(trip.minAge, trip.maxAge)}</span></div></div>
            <div className="flex justify-end items-baseline"><span className="text-slate-500 text-sm mr-1">Da</span><span className="font-bold text-2xl text-slate-900 dark:text-slate-50">{trip.price}€</span></div>
          </div>
        </CardContent>
        <CardFooter className="p-2 border-t bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              {trip.creator ? (
                <>
                  <Avatar className="h-6 w-6"><AvatarImage src={trip.creator.image ?? ''} /><AvatarFallback>{getInitials(trip.creator.first_name, trip.creator.last_name)}</AvatarFallback></Avatar>
                  {/* --- MODIFICA 2: Mostriamo solo il primo nome --- */}
                  <span className="text-xs text-slate-500 dark:text-slate-400">Creato da {trip.creator.first_name}</span>
                </>
              ) : <div className="h-6" />}
            </div>
            {session?.user?.id && session.user.id !== trip.creator?.id && (<Button size="sm" onClick={handleJoinClick} disabled={joinPending}>{joinPending ? 'Mi unisco...' : <><LogIn className="mr-2 h-4 w-4" /> Unisciti</>}</Button>)}
          </div>
        </CardFooter>
        <Link href={`/viaggi/${trip.id}`} className="absolute inset-0 z-10"><span className="sr-only">Vedi dettagli</span></Link>
      </Card>
    </div>
  );
}