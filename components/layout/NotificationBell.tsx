'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
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

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
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
            {items.map((n) => (
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
                {n.body && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {n.body}
                  </p>
                )}
                {!n.readAt && (
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
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
