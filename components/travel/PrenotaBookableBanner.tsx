import Link from 'next/link';
import type { TripWithRelations } from '@/types/trip';

export function PrenotaBookableBanner({ trips }: { trips: TripWithRelations[] }) {
  if (trips.length === 0) {
    return (
      <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">
          Prenoti i servizi dopo che il gruppo è formato.
        </p>
        <p className="mt-1 text-muted-foreground">
          Cerca tariffe qui, ma prenota dal viaggio quando il gruppo è al minimo. Ogni servizio è
          separato, con il suo fornitore.{' '}
          <Link href="/dashboard" className="underline underline-offset-2">
            Esplora
          </Link>
          {' · '}
          <Link href="/dashboard/crea?new=1" className="underline underline-offset-2">
            Crea
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-border/60 bg-card px-4 py-3">
      <p className="text-sm font-medium text-foreground">
        Gruppo formato. Prenota dal viaggio, non da un pacchetto tour operator.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {trips.slice(0, 6).map((trip) => (
          <Link
            key={trip.id}
            href={`/viaggi/${trip.id}#prenota`}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/40"
          >
            {trip.title || trip.destination}
          </Link>
        ))}
      </div>
    </div>
  );
}
