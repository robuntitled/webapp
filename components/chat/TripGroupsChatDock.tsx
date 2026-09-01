'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TripChatPanel } from '@/components/chat/TripChatPanel';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import { DEFAULT_TRIP_IMAGE } from '@/lib/brand/images';
import type { ChatContact, ChatGroupItem, ChatSearchHit } from '@/lib/chat/types';
import { isComposerPath } from '@/lib/ui/app-chrome';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TripGroupsChatDockProps = {
  currentUserId: string;
};

type Tab = 'chats' | 'friends';

export function TripGroupsChatDock({ currentUserId }: TripGroupsChatDockProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('chats');
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ChatGroupItem[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [listQuery, setListQuery] = useState('');
  const [searchHits, setSearchHits] = useState<ChatSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hidingId, setHidingId] = useState<string | null>(null);

  const hideOnComposer = isComposerPath(pathname);

  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/groups');
      if (!res.ok) {
        setGroups([]);
        setUnreadTotal(0);
        return;
      }
      const data = (await res.json()) as {
        groups: ChatGroupItem[];
        unreadTotal?: number;
      };
      setGroups(data.groups ?? []);
      setUnreadTotal(
        data.unreadTotal ??
          (data.groups ?? []).reduce((n, g) => n + (g.unreadCount ?? 0), 0)
      );
    } catch {
      setGroups([]);
      setUnreadTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContacts = useCallback(async (q?: string) => {
    setContactsLoading(true);
    try {
      const url = q?.trim()
        ? `/api/chat/contacts?q=${encodeURIComponent(q.trim())}`
        : '/api/chat/contacts';
      const res = await fetch(url);
      if (!res.ok) {
        setContacts([]);
        return;
      }
      const data = (await res.json()) as { contacts: ChatContact[] };
      setContacts(data.contacts ?? []);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hideOnComposer) return;
    void loadGroups();
    const interval = setInterval(() => void loadGroups(), 30_000);
    return () => clearInterval(interval);
  }, [hideOnComposer, loadGroups]);

  useEffect(() => {
    if (!open || tab !== 'friends') return;
    const t = setTimeout(() => void loadContacts(listQuery), 280);
    return () => clearTimeout(t);
  }, [open, tab, listQuery, loadContacts]);

  useEffect(() => {
    if (!open || tab !== 'chats') {
      setSearchHits([]);
      return;
    }
    const q = listQuery.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/chat/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSearchHits([]);
          return;
        }
        const data = (await res.json()) as { hits: ChatSearchHit[] };
        setSearchHits(data.hits ?? []);
      } catch {
        setSearchHits([]);
      } finally {
        setSearchLoading(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [open, tab, listQuery]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const tripId = (e as CustomEvent<{ tripId?: string }>).detail?.tripId;
      if (!tripId) return;
      setOpen(true);
      setTab('chats');
      setActiveTripId(tripId);
      void fetch(`/api/chat/groups/${tripId}/read`, { method: 'POST' }).then(() => loadGroups());
    };
    window.addEventListener('nomadlink:open-trip-chat', onOpen);
    return () => window.removeEventListener('nomadlink:open-trip-chat', onOpen);
  }, [loadGroups]);

  useEffect(() => {
    if (!open) {
      setActiveTripId(null);
      setListQuery('');
      setTab('chats');
    }
  }, [open]);

  const filteredGroups = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q || searchHits.length > 0) return groups;
    return groups.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.destination.toLowerCase().includes(q) ||
        (g.lastMessagePreview?.toLowerCase().includes(q) ?? false)
    );
  }, [groups, listQuery, searchHits.length]);

  const openTrip = (tripId: string) => {
    setActiveTripId(tripId);
    void fetch(`/api/chat/groups/${tripId}/read`, { method: 'POST' }).then(() =>
      loadGroups()
    );
  };

  const hideChat = async (tripId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHidingId(tripId);
    try {
      const res = await fetch(`/api/chat/groups/${tripId}/hide`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Impossibile eliminare la chat');
        return;
      }
      toast.message('Chat rimossa dalla lista');
      if (activeTripId === tripId) setActiveTripId(null);
      await loadGroups();
    } finally {
      setHidingId(null);
    }
  };

  if (hideOnComposer) return null;

  // Mostra il dock anche senza gruppi (tab Amici / empty state)
  if (!loading && groups.length === 0 && !open) {
    // ancora utile se ci sono contatti — carichiamo lazy all’apertura
  }

  const activeGroup = groups.find((g) => g.id === activeTripId) ?? null;
  const badge =
    unreadTotal > 0 ? (unreadTotal > 99 ? '99+' : String(unreadTotal)) : null;

  return (
    <div className="fixed bottom-5 right-5 z-[55] flex flex-col items-end gap-3 pb-[max(0px,env(safe-area-inset-bottom))]">
      <div className="flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="flex h-[min(560px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-border/80 bg-background shadow-2xl"
          >
            <div className="flex shrink-0 items-center gap-3 border-b bg-muted/40 px-4 py-3.5">
              {activeGroup ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => {
                    setActiveTripId(null);
                    void loadGroups();
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {activeGroup ? activeGroup.title : 'Chat'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {activeGroup
                    ? `${activeGroup.destination} · ${activeGroup.participantCount} persone`
                    : 'Gruppi viaggio e amici della crew'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {activeGroup ? (
              <div className="min-h-0 flex-1">
                <TripChatPanel
                  tripId={activeGroup.id}
                  currentUserId={currentUserId}
                  canAccess
                  dockMode
                />
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b px-3 pt-3 pb-2 space-y-2">
                  <div className="flex gap-1 rounded-full bg-muted/60 p-1">
                    <button
                      type="button"
                      className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        tab === 'chats' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                      }`}
                      onClick={() => {
                        setTab('chats');
                        setListQuery('');
                      }}
                    >
                      Chat
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        tab === 'friends' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                      }`}
                      onClick={() => {
                        setTab('friends');
                        setListQuery('');
                      }}
                    >
                      Amici
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={listQuery}
                      onChange={(e) => setListQuery(e.target.value)}
                      placeholder={
                        tab === 'chats'
                          ? 'Cerca nelle chat…'
                          : 'Cerca amici per nome o @username…'
                      }
                      className="h-10 rounded-full pl-9 bg-background"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {tab === 'chats' ? (
                    loading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : listQuery.trim().length >= 2 && (searchLoading || searchHits.length > 0) ? (
                      <div>
                        {searchLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <ul className="divide-y">
                            {searchHits.map((hit) => (
                              <li key={hit.messageId}>
                                <button
                                  type="button"
                                  className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-muted/60"
                                  onClick={() => openTrip(hit.tripId)}
                                >
                                  <span className="text-xs text-muted-foreground">
                                    {hit.tripTitle} · {hit.authorName}
                                  </span>
                                  <span className="line-clamp-2 text-sm">{hit.body}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : filteredGroups.length === 0 ? (
                      <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                        Nessuna chat di gruppo. Quando qualcuno si aggiunge alla partenza,
                        compare qui.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {filteredGroups.map((group) => (
                          <li key={group.id} className="relative">
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 px-4 py-3.5 pr-12 text-left transition-colors hover:bg-muted/60"
                              onClick={() => openTrip(group.id)}
                            >
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                                <Image
                                  src={group.imageUrl || DEFAULT_TRIP_IMAGE}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                                {group.unreadCount > 0 && (
                                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                                    {group.unreadCount > 9 ? '9+' : group.unreadCount}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{group.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {group.lastMessagePreview || group.destination}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {group.participantCount}
                              </div>
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full text-muted-foreground hover:text-destructive"
                              title="Elimina chat (solo per te)"
                              disabled={hidingId === group.id}
                              onClick={(e) => void hideChat(group.id, e)}
                            >
                              {hidingId === group.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : contactsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : contacts.length === 0 ? (
                    <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                      Qui trovi chi ha viaggiato con te. Unisciti o invita qualcuno per
                      iniziare.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {contacts.map((c) => (
                        <li key={c.userId} className="flex items-center gap-1 px-2 py-2">
                          <UserProfileLink
                            userId={c.userId}
                            username={c.username}
                            firstName={c.firstName}
                            lastName={c.lastName}
                            image={c.image}
                            mode="both"
                            size="md"
                            className="min-w-0 flex-1 rounded-xl px-2 py-1.5 hover:bg-muted/60"
                            subtitle={`Profilo · ${c.sharedTripTitle}`}
                            stopPropagation
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 rounded-full"
                            title="Apri chat del viaggio"
                            onClick={() => openTrip(c.sharedTripId)}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="button"
        size="lg"
        className={cn(
          'relative h-12 min-w-[9.5rem] gap-2 rounded-full border border-white/10 bg-[#0b1220]/92 px-6 font-semibold text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)] backdrop-blur-md',
          'hover:bg-[#161d2b] hover:text-white',
          open && 'ring-2 ring-accent/70'
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle className="h-5 w-5 text-accent" />
        <span>{open ? 'Chiudi' : 'Chat'}</span>
        {!open && badge && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-[#0b1220]">
            {badge}
          </span>
        )}
      </Button>
      </div>
    </div>
  );
}
