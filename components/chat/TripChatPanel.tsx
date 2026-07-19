'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TripMessageRow } from '@/lib/data/trip-chat';

type TripChatPanelProps = {
  tripId: string;
  currentUserId: string;
  canAccess: boolean;
  compact?: boolean;
  /** Layout senza Card, per dock espandibile */
  dockMode?: boolean;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function TripChatPanel({
  tripId,
  currentUserId,
  canAccess,
  compact = false,
  dockMode = false,
}: TripChatPanelProps) {
  const [messages, setMessages] = useState<TripMessageRow[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastFetchRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(
    async (incremental = false) => {
      if (!canAccess) return;

      const since = incremental && lastFetchRef.current ? lastFetchRef.current : undefined;
      const url = since
        ? `/api/trips/${tripId}/chat?since=${encodeURIComponent(since)}`
        : `/api/trips/${tripId}/chat`;

      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 500 && data.hint) setNeedsMigration(true);
        return;
      }

      const data = (await response.json()) as { messages: TripMessageRow[] };
      setNeedsMigration(false);

      if (incremental && data.messages.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const merged = [...prev, ...data.messages.filter((m) => !ids.has(m.id))];
          return merged;
        });
      } else if (!incremental) {
        setMessages(data.messages);
      }

      const last = data.messages[data.messages.length - 1];
      if (last) lastFetchRef.current = last.created_at;

      if (!incremental || data.messages.length > 0) {
        setTimeout(scrollToBottom, 50);
      }
    },
    [canAccess, tripId]
  );

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    void loadMessages(false).finally(() => setLoading(false));
    void fetch(`/api/chat/groups/${tripId}/read`, { method: 'POST' });

    const interval = setInterval(() => {
      void loadMessages(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [canAccess, loadMessages, tripId]);

  const sendMessage = async () => {
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setText('');

    try {
      const response = await fetch(`/api/trips/${tripId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? 'Invio fallito');
        setText(body);
        return;
      }

      const msg = data.message as TripMessageRow;
      setMessages((prev) => [...prev, msg]);
      lastFetchRef.current = msg.created_at;
      scrollToBottom();
    } catch {
      toast.error('Errore di rete');
      setText(body);
    } finally {
      setSending(false);
    }
  };

  if (!canAccess) {
    return (
      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Unisciti al viaggio per chattare con la crew.
        </CardContent>
      </Card>
    );
  }

  if (needsMigration) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Chat crew disponibile dopo <code className="text-xs">npm run db:chat</code>.
        </CardContent>
      </Card>
    );
  }

  const messagesBody = (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nessun messaggio — rompi il ghiaccio 👋
          </p>
        ) : (
          messages.map((msg) => {
            const mine = msg.user_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <UserProfileLink
                  userId={msg.user_id}
                  username={msg.user?.username}
                  firstName={msg.user?.first_name}
                  lastName={msg.user?.last_name}
                  image={msg.user?.image}
                  mode="avatar"
                  size="sm"
                  className="shrink-0 self-end"
                />
                <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!mine && (
                    <UserProfileLink
                      userId={msg.user_id}
                      username={msg.user?.username}
                      firstName={msg.user?.first_name}
                      lastName={msg.user?.last_name}
                      mode="name"
                      size="sm"
                      nameClassName="text-[10px] text-muted-foreground font-normal"
                      className="mb-0.5 px-1"
                    />
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      mine
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1 tabular-nums">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t p-3 flex gap-2 bg-muted/30">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Scrivi alla crew..."
          className="rounded-full bg-background"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          disabled={sending}
        />
        <Button
          type="button"
          size="icon"
          className="rounded-full shrink-0"
          onClick={() => void sendMessage()}
          disabled={sending || !text.trim()}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );

  if (dockMode) {
    return <div className="flex h-full min-h-0 flex-col">{messagesBody}</div>;
  }

  return (
    <Card className={`rounded-2xl border-0 shadow-lg flex flex-col ${compact ? 'h-[420px]' : 'h-[520px]'}`}>
      <CardHeader className="pb-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-display font-semibold text-base">Chat crew</h3>
            <p className="text-xs text-muted-foreground">Parla con chi organizza e chi è in relax</p>
          </div>
          <span className="ml-auto flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">{messagesBody}</CardContent>
    </Card>
  );
}