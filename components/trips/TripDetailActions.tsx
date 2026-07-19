'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { Heart, LogIn, PenSquare } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFavorite } from '@/actions/favorites';
import { joinTrip } from '@/actions/trip-management';

type TripDetailActionsProps = {
  tripId: string;
  session: Session | null;
  isCreator: boolean;
  isParticipant: boolean;
  isFavorited: boolean;
};

export function TripDetailActions({
  tripId,
  session,
  isCreator,
  isParticipant,
  isFavorited,
}: TripDetailActionsProps) {
  const router = useRouter();
  const [favPending, startFav] = useTransition();
  const [joinPending, startJoin] = useTransition();

  const handleFavorite = () => {
    if (!session) {
      router.push('/');
      return;
    }
    startFav(async () => {
      try {
        await toggleFavorite(tripId);
        toast.success(isFavorited ? 'Rimosso dai preferiti' : 'Aggiunto ai preferiti');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Errore imprevisto');
      }
    });
  };

  const handleJoin = () => {
    if (!session) {
      router.push('/');
      return;
    }
    startJoin(async () => {
      try {
        await joinTrip(tripId);
        toast.success('Sei dentro! Modalità relax attiva 🏖️');
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
    <div className="flex flex-col gap-2 pt-2">
      {session?.user && (
        <Button variant="outline" onClick={handleFavorite} disabled={favPending}>
          <Heart
            className={`mr-2 h-4 w-4 ${isFavorited ? 'text-red-500 fill-current' : ''}`}
          />
          {isFavorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        </Button>
      )}

      {isCreator && (
        <Button asChild variant="secondary">
          <Link href={`/dashboard/viaggi/${tripId}/modifica`}>
            <PenSquare className="mr-2 h-4 w-4" />
            Modifica viaggio
          </Link>
        </Button>
      )}

      {session?.user && !isCreator && !isParticipant && (
        <Button onClick={handleJoin} disabled={joinPending}>
          <LogIn className="mr-2 h-4 w-4" />
          {joinPending ? 'Entro...' : 'Ci sto! (zero pianificazione)'}
        </Button>
      )}

      {isParticipant && !isCreator && (
        <p className="text-sm text-green-600 font-medium text-center">
          Sei iscritto a questo viaggio
        </p>
      )}
    </div>
  );
}