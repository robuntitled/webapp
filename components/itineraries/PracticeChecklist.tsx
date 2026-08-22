'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  confirmActivityAction,
  confirmFlightAction,
  confirmHotelAction,
} from '@/actions/practices';
import { Button } from '@/components/ui/button';
import type { PracticeRow } from '@/lib/data/practices';

export function PracticeChecklist({ practice }: { practice: PracticeRow }) {
  const [pending, startTransition] = useTransition();
  const groupLocked = practice.mode === 'group' && !practice.flight_confirmed_at;

  function run(fn: (id: string) => Promise<unknown>) {
    startTransition(async () => {
      const result = (await fn(practice.id)) as { error?: string };
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <ol className="space-y-4">
      <li className="rounded-[10px] border border-border bg-card p-4">
        <p className="font-semibold">1. Volo · posto confermato</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Prenota il volo col fornitore. Poi conferma qui. In gruppo è l’impegno.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/prenota/voli">Cerca voli</Link>
          </Button>
          <Button
            size="sm"
            disabled={pending || Boolean(practice.flight_confirmed_at)}
            onClick={() => run(confirmFlightAction)}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {practice.flight_confirmed_at ? 'Volo confermato' : 'Ho prenotato il volo'}
          </Button>
        </div>
      </li>
      <li className="rounded-[10px] border border-border bg-card p-4">
        <p className="font-semibold">2. Hotel · stessa zona, camera tua</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {groupLocked
            ? 'Si sblocca quando hai confermato il volo.'
            : 'Checkout separato. Stesso hotel/zona del piano.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" disabled={groupLocked}>
            <Link href="/prenota/hotel">Cerca hotel</Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || groupLocked || Boolean(practice.hotel_confirmed_at)}
            onClick={() => run(confirmHotelAction)}
          >
            {practice.hotel_confirmed_at ? 'Hotel confermato' : 'Ho prenotato l’hotel'}
          </Button>
        </div>
      </li>
      <li className="rounded-[10px] border border-border bg-card p-4">
        <p className="font-semibold">3. Attività · biglietto individuale</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {groupLocked ? 'Dopo il volo.' : 'Stesso slot del template, contratto tuo.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" disabled={groupLocked}>
            <Link href="/prenota/attivita">Cerca attività</Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || groupLocked || Boolean(practice.activity_confirmed_at)}
            onClick={() => run(confirmActivityAction)}
          >
            {practice.activity_confirmed_at ? 'Attività confermata' : 'Ho prenotato un’attività'}
          </Button>
        </div>
      </li>
    </ol>
  );
}
