'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Edit,
  Trash2,
  MapPin,
  CalendarDays,
  Users,
  ExternalLink,
  Share2,
  TrendingDown,
} from 'lucide-react';
import type { TripWithRelations } from '@/types/trip';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { deleteTrip } from '@/actions/trip-management';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { getTripStatus } from '@/lib/utils/trip';
import { TRIP_ROLE_META } from '@/lib/trips/roles';
import { PLANNING_MODE_META, formatSpotsLabel } from '@/lib/trips/display';
import { TripRoleBadge } from '@/components/trips/TripRoleBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type TripManagementCardProps = {
  trip: TripWithRelations;
  variant: 'organizing' | 'relax';
};

export function TripManagementCard({ trip, variant }: TripManagementCardProps) {
  const [isPending, startTransition] = useTransition();
  const imageUrl = trip.imageUrl || '/images/trips/placeholder.jpg';
  const status = getTripStatus(trip.startDate, trip.endDate);
  const planningMode = trip.planningMode ?? 'group';
  const modeMeta = PLANNING_MODE_META[planningMode];
  const participantCount = trip.participantCount ?? 0;
  const spotsLabel = formatSpotsLabel(trip.maxParticipants, participantCount);
  const role = trip.myRole ?? (variant === 'organizing' ? 'owner' : 'viewer');

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteTrip(trip.id);
        toast.success('Viaggio eliminato');
      } catch (error) {
        console.error('Errore:', error);
        toast.error('Impossibile eliminare il viaggio.');
      }
    });
  };

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/viaggi/${trip.id}`
      : `https://webapp-bice-six-42.vercel.app/viaggi/${trip.id}`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copiato — mandalo agli amici svogliati 😎');
    } catch {
      toast.error('Impossibile copiare il link');
    }
  };

  return (
    <Card className="w-full overflow-hidden rounded-2xl border-0 shadow-md transition-all hover:shadow-lg">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-44 sm:h-auto sm:w-36 md:w-52 flex-shrink-0">
          <Link href={`/viaggi/${trip.id}`} className="block h-full w-full">
            <Image
              src={imageUrl}
              alt={`Immagine del viaggio ${trip.title}`}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent sm:bg-gradient-to-r" />
          </Link>
        </div>

        <div className="p-5 flex-grow flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant={status.variant}>{status.text}</Badge>
                <Badge variant="outline" className="text-xs">
                  {modeMeta.emoji} {modeMeta.shortLabel}
                </Badge>
                {variant === 'relax' && <TripRoleBadge role={role} />}
              </div>
              <Link href={`/viaggi/${trip.id}`} className="block hover:no-underline group">
                <h3 className="font-display text-xl font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                  {trip.title}
                </h3>
              </Link>
              <div className="flex flex-wrap items-center text-xs text-muted-foreground mt-2 gap-x-4 gap-y-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {trip.destination}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(trip.startDate), 'dd MMM yy', { locale: it })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {participantCount}/{trip.maxParticipants} · {spotsLabel}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">da</p>
              <p className="text-2xl font-bold text-primary tabular-nums">{trip.price}€</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {variant === 'organizing'
              ? 'Tu sei l\'organizzatore — aggiorna il radar prezzi e invita chi non vuole pianificare.'
              : `${TRIP_ROLE_META[role].emoji} ${TRIP_ROLE_META[role].description}`}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="default" className="rounded-full">
              <Link href={`/viaggi/${trip.id}`}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Apri viaggio
              </Link>
            </Button>

            {variant === 'organizing' && (
              <>
                <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={() => void copyInvite()}>
                  <Share2 className="mr-2 h-3.5 w-3.5" />
                  Invita amici
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link href={`/viaggi/${trip.id}#radar`}>
                    <TrendingDown className="mr-2 h-3.5 w-3.5" />
                    Radar prezzi
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link href={`/dashboard/viaggi/${trip.id}/modifica`}>
                    <Edit className="mr-2 h-3.5 w-3.5" />
                    Modifica
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-full text-destructive hover:text-destructive" disabled={isPending}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      {isPending ? 'Elimino...' : 'Elimina'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminare questo viaggio?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tutta la crew perderà accesso a &quot;{trip.title}&quot;. Non si torna indietro.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Sì, elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}