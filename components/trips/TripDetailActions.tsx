'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { Heart, LogIn, PenSquare } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFavorite } from '@/actions/favorites';
import { joinTrip } from '@/actions/trip-management';
import { isPhoneGateError, PhoneVerifyGate } from '@/components/auth/PhoneVerifyGate';

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
  const [phoneGateOpen, setPhoneGateOpen] = useState(false);

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

  const doJoin = async () => {
    const result = await joinTrip(tripId);
    if (!result.ok) {
      if (result.code === 'PHONE_VERIFY_REQUIRED' || isPhoneGateError(result.error)) {
        setPhoneGateOpen(true);
        return;
      }
      toast.error(result.error);
      return;
    }
    toast.success(
      result.alreadyJoined
        ? 'Sei già nella crew di questo viaggio'
        : 'Sei dentro! Modalità relax attiva 🏖️'
    );
    router.refresh();
  };

  const handleJoin = () => {
    if (!session) {
      router.push('/');
      return;
    }
    startJoin(() => doJoin());
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <PhoneVerifyGate
        open={phoneGateOpen}
        onOpenChange={setPhoneGateOpen}
        onVerified={() => startJoin(() => doJoin())}
      />

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
          {joinPending ? 'Iscrizione…' : 'Partecipa'}
        </Button>
      )}
    </div>
  );
}
