'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UserProfileLink } from '@/components/profile/UserProfileLink';
import { Flag, Loader2, MessageCircle, MoreHorizontal, Send, Ban } from 'lucide-react';
import { toast } from 'sonner';
import type { TripMessageRow } from '@/lib/data/trip-chat';
import { useIntervalWhenVisible } from '@/hooks/useIntervalWhenVisible';

type TripChatPanelProps = {
  tripId: string;
  currentUserId: string;
  canAccess: boolean;
  /** Messaggio quando canAccess è false (membro ma chat ancora chiusa, ecc.). */
  lockReason?: string;
  compact?: boolean;
  /** Layout senza Card, per dock espandibile */
  dockMode?: boolean;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

async function postModeration(
  path: '/api/chat/report' | '/api/chat/block',
  body: Record<string, unknown>
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
  };
  if (!response.ok) {
    return { ok: false, error: data.error ?? 'Operazione non riuscita' };
  }
  return { ok: true, message: data.message };
}

export function TripChatPanel({
  tripId,
  currentUserId,
  canAccess,
  lockReason,
  compact = false,
  dockMode = false,
}: TripChatPanelProps) {
  const [messages, setMessages] = useState<TripMessageRow[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busyModeration, setBusyModeration] = useState(false);
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
  }, [canAccess, loadMessages, tripId]);

  // 10s invece di 3s; pausa con scheda nascosta (Realtime = follow-up)
  useIntervalWhenVisible(
    () => {
      void loadMessages(true);
    },
    canAccess ? 10_000 : null,
    { runOnMount: false }
  );

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

  const reportMessage = async (msg: TripMessageRow) => {
    const reason = window.prompt(
      'Perché segnali questo messaggio? (es. spam, minacce, richieste di soldi fuori piattaforma)'
    );
    if (!reason || reason.trim().length < 3) return;
    setBusyModeration(true);
    setMenuFor(null);
    try {
      const result = await postModeration('/api/chat/report', {
        target: 'message',
        reason: reason.trim(),
        editionId: tripId,
        messageId: msg.id,
        reportedUserId: msg.user_id,
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Segnalazione non inviata');
        return;
      }
      toast.success(result.message ?? 'Segnalazione ricevuta.');
    } finally {
      setBusyModeration(false);
    }
  };

  const reportGroup = async () => {
    const reason = window.prompt('Perché segnali questo gruppo?');
    if (!reason || reason.trim().length < 3) return;
    setBusyModeration(true);
    try {
      const result = await postModeration('/api/chat/report', {
        target: 'group',
        reason: reason.trim(),
        editionId: tripId,
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Segnalazione non inviata');
        return;
      }
      toast.success(result.message ?? 'Segnalazione ricevuta.');
    } finally {
      setBusyModeration(false);
    }
  };

  const blockAuthor = async (msg: TripMessageRow) => {
    const ok = window.confirm(
      'Bloccare questo utente? Non vedrai più i suoi messaggi in chat. Potrai sbloccarlo dal supporto se serve.'
    );
    if (!ok) return;
    setBusyModeration(true);
    setMenuFor(null);
    try {
      const result = await postModeration('/api/chat/block', {
        userId: msg.user_id,
        action: 'block',
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Blocco non riuscito');
        return;
      }
      setMessages((prev) => prev.filter((m) => m.user_id !== msg.user_id));
      toast.success(result.message ?? 'Utente bloccato.');
    } finally {
      setBusyModeration(false);
    }
  };

  if (!canAccess) {
    const body = lockReason ?? 'Unisciti al viaggio per chattare con la crew.';
    if (dockMode) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
          <MessageCircle className="h-8 w-8 opacity-40" aria-hidden />
          <p>{body}</p>
        </div>
      );
    }
    return (
      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {body}
        </CardContent>
      </Card>
    );
  }

  if (needsMigration) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Chat crew non ancora disponibile per questa edizione.
        </CardContent>
      </Card>
    );
  }

  const messagesBody = (
    <>
      <div className="shrink-0 border-b bg-muted/20 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
        Non mandare soldi fuori da Noivia. Noivia non verifica l’identità degli utenti.{' '}
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
          onClick={() => void reportGroup()}
          disabled={busyModeration}
        >
          Segnala gruppo
        </button>
      </div>
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
                    <div className="mb-0.5 flex items-center gap-1 px-1">
                      <UserProfileLink
                        userId={msg.user_id}
                        username={msg.user?.username}
                        firstName={msg.user?.first_name}
                        lastName={msg.user?.last_name}
                        mode="name"
                        size="sm"
                        nameClassName="text-[10px] text-muted-foreground font-normal"
                      />
                      <div className="relative">
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Azioni messaggio"
                          disabled={busyModeration}
                          onClick={() =>
                            setMenuFor((cur) => (cur === msg.id ? null : msg.id))
                          }
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        {menuFor === msg.id ? (
                          <div className="absolute left-0 z-20 mt-1 w-40 rounded-lg border border-border bg-background py-1 text-xs shadow-md">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted"
                              onClick={() => void reportMessage(msg)}
                            >
                              <Flag className="h-3.5 w-3.5" />
                              Segnala
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-destructive hover:bg-muted"
                              onClick={() => void blockAuthor(msg)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Blocca
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
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
