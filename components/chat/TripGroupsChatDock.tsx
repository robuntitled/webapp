'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, MessageCircle, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TripChatPanel } from '@/components/chat/TripChatPanel';
import { DEFAULT_TRIP_IMAGE } from '@/lib/brand/images';
import type { ChatGroupItem } from '@/lib/chat/types';

type TripGroupsChatDockProps = {
  currentUserId: string;
};

export function TripGroupsChatDock({ currentUserId }: TripGroupsChatDockProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ChatGroupItem[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  const hideOnComposer = pathname?.startsWith('/dashboard/crea');

  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/groups');
      if (!res.ok) {
        setGroups([]);
        return;
      }
      const data = (await res.json()) as { groups: ChatGroupItem[] };
      setGroups(data.groups ?? []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hideOnComposer) return;
    void loadGroups();
    const interval = setInterval(() => void loadGroups(), 60_000);
    return () => clearInterval(interval);
  }, [hideOnComposer, loadGroups]);

  useEffect(() => {
    if (!open) setActiveTripId(null);
  }, [open]);

  if (hideOnComposer || (!loading && groups.length === 0)) {
    return null;
  }

  const activeGroup = groups.find((g) => g.id === activeTripId) ?? null;

  return (
    <div className="fixed bottom-5 right-5 z-[55] flex flex-col items-end gap-3">
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
                  onClick={() => setActiveTripId(null)}
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
                  {activeGroup ? activeGroup.title : 'Chat gruppi'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {activeGroup
                    ? `${activeGroup.destination} · ${activeGroup.participantCount} persone`
                    : 'I tuoi viaggi con crew'}
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
              <div className="min-h-0 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ul className="divide-y">
                    {groups.map((group) => (
                      <li key={group.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60"
                          onClick={() => setActiveTripId(group.id)}
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                            <Image
                              src={group.imageUrl || DEFAULT_TRIP_IMAGE}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{group.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {group.destination}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {group.participantCount}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="button"
        size="lg"
        className={`h-14 gap-2 rounded-full px-5 font-semibold shadow-xl ${open ? 'opacity-90' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">{open ? 'Chiudi chat' : 'Chat'}</span>
        {!open && groups.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-background/20 px-1.5 text-[11px] font-bold">
            {groups.length}
          </span>
        )}
      </Button>
    </div>
  );
}
