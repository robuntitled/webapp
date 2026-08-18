'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { Clock, Heart, LogIn, PenSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFavorite } from '@/actions/favorites';
import { cancelJoinRequest, requestToJoinTrip } from '@/actions/trip-join-requests';
import { isPhoneGateError, PhoneVerifyGate } from '@/components/auth/PhoneVerifyGate';

type TripDetailActionsProps = {
  tripId: string;
  session: Session | null;
  isCreator: boolean;
  isParticipant: boolean;
  isFavorited: boolean;
  joinRequestStatus?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | null;
};

export function TripDetailActions({
  tripId,
  session,
  isCreator,
  isParticipant,
  isFavorited,
  joinRequestStatus = null,
}: TripDetailActionsProps) {
  const router = useRouter();
  const [favPending, startFav] = useTransition();
  const [joinPending, startJoin] = useTransition();
  const [phoneGateOpen, setPhoneGateOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState(joinRequestStatus);

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
    const result = await requestToJoinTrip(tripId);
    if (!result.ok) {
      if (result.code === 'PHONE_VERIFY_REQUIRED' || isPhoneGateError(result.error)) {
        setPhoneGateOpen(true);
        return;
      }
      toast.error(result.error);
      return;
    }
    if (result.status === 'already_member') {
      toast.success('Sei già nella crew di questo viaggio');
    } else {
      setLocalStatus('pending');
      toast.success(
        result.status === 'already_pending'
          ? 'Richiesta già inviata: aspetta la risposta del creatore'
          : 'Richiesta inviata. Prenoti i servizi quando il gruppo è formato.'
      );
    }
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

      {session?.user && !isCreator && !isParticipant && localStatus === 'pending' && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            Richiesta inviata — in attesa del creatore
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            disabled={joinPending}
            onClick={() =>
              startJoin(async () => {
                const res = await cancelJoinRequest(tripId);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                setLocalStatus('cancelled');
                toast.message('Richiesta annullata');
                router.refresh();
              })
            }
          >
            <X className="mr-1.5 h-4 w-4" />
            Annulla richiesta
          </Button>
        </div>
      )}

      {session?.user && !isCreator && !isParticipant && localStatus === 'rejected' && (
        <div className="rounded-xl border bg-muted/40 px-3 py-2.5 text-center text-sm text-muted-foreground">
          Il creatore ha rifiutato la tua richiesta.
        </div>
      )}

      {session?.user &&
        !isCreator &&
        !isParticipant &&
        localStatus !== 'pending' &&
        localStatus !== 'rejected' && (
          <Button onClick={handleJoin} disabled={joinPending}>
            <LogIn className="mr-2 h-4 w-4" />
            {joinPending ? 'Invio richiesta…' : 'Unisciti al viaggio'}
          </Button>
        )}
    </div>
  );
}
