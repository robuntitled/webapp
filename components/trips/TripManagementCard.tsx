'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MapPin, CalendarDays } from 'lucide-react';
import { type TripWithRelations } from './TripCard';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { deleteTrip } from '../../actions/trip-management';
import { useTransition } from 'react';
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
} from "@/components/ui/alert-dialog"

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

export function TripManagementCard({ trip, showActions = false }: { trip: TripWithRelations, showActions?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const imageUrl = trip.imageUrl || '/images/placeholder-viaggio.jpg';
  const status = getTripStatus(trip.startDate, trip.endDate);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteTrip(trip.id);
      } catch (error) {
        console.error("Errore:", error);
        alert("Impossibile eliminare il viaggio.");
      }
    });
  };

  return (
    <Card className="w-full transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-40 sm:h-auto sm:w-32 md:w-48 flex-shrink-0">
          <Link href={`/viaggi/${trip.id}`} className="block h-full w-full">
            <Image
              src={imageUrl}
              alt={`Immagine del viaggio ${trip.title}`}
              fill
              style={{ objectFit: "cover" }}
              className="rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none"
            />
          </Link>
        </div>
        <div className="p-4 flex-grow flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-grow">
            <Badge variant={status.variant} className="mb-2">{status.text}</Badge>
            <Link href={`/viaggi/${trip.id}`} className="block hover:no-underline">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 line-clamp-1 hover:text-blue-600">{trip.title}</h3>
            </Link>
            <div className="flex flex-wrap items-center text-xs text-slate-500 dark:text-slate-400 mt-1 gap-x-3 gap-y-1">
              <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" />{trip.destination}</span>
              <span className="flex items-center"><CalendarDays className="h-3 w-3 mr-1" />{format(new Date(trip.startDate), "dd MMM yy", { locale: it })}</span>
            </div>
          </div>
          {showActions && (
            <div className="mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 flex items-center space-x-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/viaggi/${trip.id}/modifica`}>
                  <Edit className="mr-2 h-4 w-4"/>
                  Modifica
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isPending}>
                    <Trash2 className="mr-2 h-4 w-4"/>
                    {isPending ? "Elimino..." : "Elimina"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questa azione non può essere annullata. Il viaggio "{trip.title}" verrà eliminato.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                      Sì, elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}