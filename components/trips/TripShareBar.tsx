'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Check, Loader2, MessageCircle, Share2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { sendTripInvite, respondTripInvite } from '@/actions/trip-invites';
import { getInitialsFromNames } from '@/lib/utils/user';

type Contact = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  image: string | null;
};

type TripShareBarProps = {
  tripId: string;
  tripTitle: string;
  canInvite: boolean;
  tone?: 'default' | 'onDark';
};

export function TripShareBar({
  tripId,
  tripTitle,
  canInvite,
  tone = 'default',
}: TripShareBarProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const btnClass =
    tone === 'onDark'
      ? 'h-10 w-10 rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white'
      : 'h-10 w-10 rounded-full';

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/viaggi/${tripId}`
      : `/viaggi/${tripId}`;

  const inviteMessage = `Ciao! Ti invito a "${tripTitle}" su NomadLink: ${shareUrl}`;

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const loadContacts = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/chat/contacts?q=${encodeURIComponent(query.trim())}`
      );
      const data = (await res.json()) as { contacts?: Contact[]; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Impossibile caricare gli amici');
        return;
      }
      setContacts(data.contacts ?? []);
    } catch {
      toast.error('Errore di rete');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void loadContacts(q), 200);
    return () => clearTimeout(t);
  }, [open, q, loadContacts]);

  const invite = (toUserId: string) => {
    startTransition(async () => {
      const res = await sendTripInvite({ tripId, toUserId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Invito inviato — potrà accettare o rifiutare');
      setOpen(false);
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={btnClass}
          onClick={shareWhatsApp}
          title="Condividi su WhatsApp"
          aria-label="Condividi su WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        {canInvite ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={btnClass}
            onClick={() => setOpen(true)}
            title="Invita un amico"
            aria-label="Invita un amico"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={btnClass}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copiato');
              } catch {
                toast.error('Impossibile copiare');
              }
            }}
            title="Copia link"
            aria-label="Copia link"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Invita un amico</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Cerca tra gli amici…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-xl"
          />
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {loading ? (
              <li className="flex justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </li>
            ) : contacts.length === 0 ? (
              <li className="py-8 text-center text-sm text-muted-foreground">
                Nessun amico trovato. Gli amici sono chi ha già viaggiato con te.
              </li>
            ) : (
              contacts.map((c) => {
                const name =
                  [c.firstName, c.lastName].filter(Boolean).join(' ') ||
                  (c.username ? `@${c.username}` : 'Utente');
                return (
                  <li key={c.userId}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => invite(c.userId)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted/60 disabled:opacity-50"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={c.image ?? ''} alt="" />
                        <AvatarFallback className="text-xs">
                          {getInitialsFromNames(c.firstName, c.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {name}
                      </span>
                      <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

type PendingInvite = {
  id: string;
  tripId: string;
  tripTitle: string;
  tripDestination: string;
  from: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    image: string | null;
  };
};

type TripInviteInboxProps = {
  invites: PendingInvite[];
};

export function TripInviteInbox({ invites }: TripInviteInboxProps) {
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  if (!invites.length) return null;

  const visible = invites.filter((i) => !hidden.has(i.id));
  if (!visible.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold">Inviti in sospeso</h2>
      <ul className="space-y-2">
        {visible.map((inv) => {
          const fromName =
            [inv.from.firstName, inv.from.lastName].filter(Boolean).join(' ') ||
            (inv.from.username ? `@${inv.from.username}` : 'Qualcuno');
          return (
            <li
              key={inv.id}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{inv.tripTitle}</p>
                <p className="text-sm text-muted-foreground">
                  {fromName}
                  {inv.tripDestination ? ` · ${inv.tripDestination}` : ''}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await respondTripInvite({
                        inviteId: inv.id,
                        accept: true,
                      });
                      if (!res.ok) {
                        toast.error(res.error);
                        return;
                      }
                      toast.success('Sei nella crew!');
                      setHidden((s) => new Set(s).add(inv.id));
                    });
                  }}
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
                  onClick={() => {
                    startTransition(async () => {
                      const res = await respondTripInvite({
                        inviteId: inv.id,
                        accept: false,
                      });
                      if (!res.ok) {
                        toast.error(res.error);
                        return;
                      }
                      toast.message('Invito rifiutato');
                      setHidden((s) => new Set(s).add(inv.id));
                    });
                  }}
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
