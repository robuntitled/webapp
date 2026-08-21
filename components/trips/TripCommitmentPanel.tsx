import {
  confirmedFlightCount,
  hotelGroupCount,
  usesFlightThreshold,
} from '@/lib/trips/commitment';
import { isGroupSolid, tripMinSeats } from '@/lib/trips/formation';
import type { TripWithRelations } from '@/types/trip';
import { BedDouble, Plane, Ticket } from 'lucide-react';

type TripCommitmentPanelProps = {
  trip: TripWithRelations;
};

function Counter({
  icon: Icon,
  label,
  value,
  target,
  hint,
}: {
  icon: typeof Plane;
  label: string;
  value: number;
  target: number;
  hint: string;
}) {
  const done = value >= target;
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        done ? 'border-accent/35 bg-accent/5' : 'border-border/60 bg-card'
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-accent" />
        {label}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
        {value}
        <span className="text-base font-normal text-muted-foreground"> / {target}</span>
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function TripCommitmentPanel({ trip }: TripCommitmentPanelProps) {
  const min = tripMinSeats(trip);
  const flightMode = usesFlightThreshold(trip);
  const flights = confirmedFlightCount(trip);
  const hotels = hotelGroupCount(trip);
  const solid = isGroupSolid(trip);

  if (!flightMode) return null;

  return (
    <section className="rounded-[1.75rem] border border-border/50 bg-card p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
        {solid ? 'Soglia raggiunta' : 'Verso la soglia'}
      </p>
      <h2 className="mt-1 font-display text-xl font-semibold">
        {flightMode ? 'Voli confermati = posto confermato' : 'Posti al minimo'}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {flightMode
          ? 'Ognuno prenota il proprio volo col fornitore. Hotel e attività si sbloccano dopo la soglia voli.'
          : 'Quando il gruppo raggiunge il minimo, si sbloccano hotel e attività.'}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Counter
          icon={Plane}
          label="Voli ok"
          value={flights}
          target={min}
          hint={solid ? 'Soglia voli raggiunta' : 'Mancano prenotazioni volo'}
        />
        <Counter
          icon={BedDouble}
          label="Hotel gruppo"
          value={hotels}
          target={min}
          hint={
            solid
              ? 'Stesso hotel suggerito (modo A), camera propria'
              : 'Si sblocca dopo la soglia voli'
          }
        />
        <Counter
          icon={Ticket}
          label="Biglietti"
          value={trip.activityTicketCount ?? 0}
          target={min}
          hint={solid ? 'Attività a pagamento del template' : 'Dopo soglia voli'}
        />
      </div>
    </section>
  );
}
