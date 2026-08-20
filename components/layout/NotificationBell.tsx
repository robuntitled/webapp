'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/actions/notifications';
import { respondJoinRequest } from '@/actions/trip-join-requests';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ora';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} g`;
}

function joinRequestId(n: NotificationItem): string | null {
  const id = n.metadata?.requestId;
  return typeof id === 'string' ? id : null;
}

function isPendingJoinRequest(n: NotificationItem): boolean {
  return (
    n.type === 'trip_join_request' &&
    joinRequestId(n) != null &&
    (n.metadata?.requestStatus === 'pending' || n.metadata?.requestStatus == null)
  );
}

function JoinRequestActions({
  notification,
  disabled,
  onRespond,
}: {
  notification: NotificationItem;
  disabled: boolean;
  onRespond: (n: NotificationItem, accept: boolean) => void;
}) {
  return (
    <div className="mt-2 flex w-full gap-2">
      <Button
        type="button"
        size="sm"
        className="h-7 flex-1 rounded-full"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRespond(notification, true);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Check className="h-3.5 w-3.5" />
        Accetta
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 flex-1 rounded-full"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRespond(notification, false);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <X className="h-3.5 w-3.5" />
        Rifiuta
      </Button>
    </div>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: NotificationItem[];
        unreadCount?: number;
      };
      setItems(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // silent — campanella non critica
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const onItemClick = (n: NotificationItem) => {
    if (isPendingJoinRequest(n)) return;
    startTransition(async () => {
      if (!n.readAt) {
        await markNotificationRead(n.id);
        setUnread((u) => Math.max(0, u - 1));
        setItems((list) =>
          list.map((x) =>
            x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x
          )
        );
      }
      if (n.link) {
        setOpen(false);
        router.push(n.link);
      }
    });
  };

  const respond = (n: NotificationItem, accept: boolean) => {
    const requestId = joinRequestId(n);
    if (!requestId) return;
    startTransition(async () => {
      const res = await respondJoinRequest({ requestId, accept });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(accept ? 'Accettato — è in crew!' : 'Richiesta rifiutata');
      if (!n.readAt) {
        await markNotificationRead(n.id);
        setUnread((u) => Math.max(0, u - 1));
      }
      setItems((list) =>
        list.map((x) =>
          x.id === n.id
            ? {
                ...x,
                readAt: x.readAt ?? new Date().toISOString(),
                metadata: {
                  ...x.metadata,
                  requestStatus: accept ? 'accepted' : 'rejected',
                },
              }
            : x
        )
      );
    });
  };

  const markAll = () => {
    startTransition(async () => {
      const res = await markAllNotificationsRead();
      if (!res.ok) return;
      setUnread(0);
      setItems((list) =>
        list.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() }))
      );
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={
            unread > 0 ? `Notifiche, ${unread} non lette` : 'Notifiche'
          }
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 sm:w-96" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between gap-2 font-normal">
          <span className="font-display text-sm font-semibold">Notifiche</span>
          {unread > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={markAll}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Segna tutte come lette
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground">
            Nessuna notifica
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map((n) => {
              const pendingJoin = isPendingJoinRequest(n);
              const resolved =
                n.type === 'trip_join_request' &&
                (n.metadata?.requestStatus === 'accepted' ||
                  n.metadata?.requestStatus === 'rejected');
              return (
                <DropdownMenuItem
                  key={n.id}
                  className="cursor-pointer flex-col items-start gap-0.5 py-3"
                  onSelect={(e) => {
                    e.preventDefault();
                    onItemClick(n);
                  }}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <p
                      className={`text-sm leading-snug ${
                        n.readAt ? 'font-normal' : 'font-semibold'
                      }`}
                    >
                      {n.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {relativeTime(n.createdAt)}
                    </span>
                  </div>
                  {n.body ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  ) : null}
                  {resolved ? (
                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                      {n.metadata?.requestStatus === 'accepted'
                        ? 'Accettata'
                        : 'Rifiutata'}
                    </p>
                  ) : null}
                  {pendingJoin ? (
                    <JoinRequestActions
                      notification={n}
                      disabled={pending}
                      onRespond={respond}
                    />
                  ) : null}
                  {!n.readAt && !pendingJoin ? (
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/miei-viaggi"
            className="justify-center text-sm text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            Vai a I Miei Viaggi
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
