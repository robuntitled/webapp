'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { MapPin, CalendarDays, Edit } from 'lucide-react';
import { type TripWithRelations } from './TripCard'; // Importiamo il tipo esistente
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Funzione per determinare lo stato del viaggio
const getTripStatus = (startDate: string, endDate: string): { text: string, variant: "default" | "secondary" | "destructive" | "outline" } => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now > end) {
    return { text: "Concluso", variant: "secondary" };
  }
  if (now >= start && now <= end) {
    return { text: "In Corso", variant: "destructive" };
  }
  return { text: "Prossimamente", variant: "default" };
};

export function TripRowCard({ trip }: { trip: TripWithRelations }) {
  const imageUrl = trip.imageUrl || '/images/placeholder-viaggio.jpg';
  const status = getTripStatus(trip.startDate, trip.endDate);

  return (
    <Card className="w-full transition-all hover:shadow-md">
      <div className="flex items-center">
        {/* Immagine a Sinistra */}
        <div className="relative h-28 w-28 md:h-32 md:w-48 flex-shrink-0">
          <Image
            src={imageUrl}
            alt={`Immagine del viaggio ${trip.title}`}
            fill
            style={{ objectFit: "cover" }}
            className="rounded-l-lg"
          />
        </div>
        
        {/* Contenuto a Destra */}
        <div className="p-4 flex-grow flex flex-col md:flex-row md:items-center md:justify-between">
          
          {/* Dettagli principali */}
          <div className="flex-grow">
            <Badge variant={status.variant} className="mb-1">{status.text}</Badge>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 line-clamp-1">{trip.title}</h3>
            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
              <MapPin className="h-4 w-4 mr-1.5" />
              <span>{trip.destination}</span>
            </div>
             <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
              <CalendarDays className="h-4 w-4 mr-1.5" />
              <span>{format(new Date(trip.startDate), "dd MMM", { locale: it })} - {format(new Date(trip.endDate), "dd MMM yyyy", { locale: it })}</span>
            </div>
          </div>
          
          {/* Azioni */}
          <div className="mt-4 md:mt-0 md:ml-4 flex-shrink-0">
            <Button asChild>
              <Link href={`/dashboard/viaggi/${trip.id}/modifica`}>
                <Edit className="mr-2 h-4 w-4"/>
                Gestisci
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}