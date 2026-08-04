'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { respondJoinRequest } from '@/actions/trip-join-requests';
import { getInitialsFromNames } from '@/lib/utils/user';

export type JoinRequestItem = {
  id: string;
  tripId: string;
  tripTitle: string;
  tripDestination: string;
  message: string | null;
  from: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    image: string | null;
  };
};

type TripJoinRequestsInboxProps = {
  requests: JoinRequestItem[];
  /** Nasconde il titolo del viaggio quando l'elenco è già dentro un viaggio. */
  showTripTitle?: boolean;
  className?: string;
};

export function TripJoinRequestsInbox({
  requests,
  showTripTitle = true,
  className,
}: TripJoinRequestsInboxProps) {
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visible = requests.filter((r) => !hidden.has(r.id));
  if (!visible.length) return null;

  const respond = (requestId: string, accept: boolean) => {
    startTransition(async () => {
      const res = await respondJoinRequest({ requestId, accept });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(accept ? 'Richiesta accettata — è nella crew!' : 'Richiesta rifiutata');
      setHidden((s) => new Set(s).add(requestId));
    });
  };

  return (
    <section className={className}>
      <h2 className="font-display text-lg font-semibold">
        Richieste di partecipazione
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {visible.length}
        </span>
      </h2>
      <ul className="mt-3 space-y-2">
        {visible.map((req) => {
          const name =
            [req.from.firstName, req.from.lastName].filter(Boolean).join(' ') ||
            (req.from.username ? `@${req.from.username}` : 'Un viaggiatore');
          return (
            <li
              key={req.id}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={req.from.image ?? ''} alt="" />
                  <AvatarFallback className="text-xs">
                    {getInitialsFromNames(req.from.firstName, req.from.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {showTripTitle
                      ? `Vuole unirsi a ${req.tripTitle}`
                      : 'Vuole unirsi al viaggio'}
                    {showTripTitle && req.tripDestination ? ` · ${req.tripDestination}` : ''}
                  </p>
                  {req.message && (
                    <p className="mt-1 line-clamp-2 text-sm italic text-muted-foreground">
                      “{req.message}”
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  disabled={pending}
                  onClick={() => respond(req.id, true)}
                >
                  <Check className="mr-1.5 h-4 w-4" />
                  Accetta
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={pending}
                  onClick={() => respond(req.id, false)}
                >
                  <X className="mr-1.5 h-4 w-4" />
                  Rifiuta
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
