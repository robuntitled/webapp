'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import type { ComposerDraft } from '@/types/composer';
import type { ComposerWizardStep } from '@/lib/composer/wizard-steps';
import type { PlannerProfile } from '@/types/planner';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'ai' | 'mock';
};

type ComposerAssistantDockProps = {
  draft: ComposerDraft;
  step: ComposerWizardStep;
  plannerProfile?: PlannerProfile | null;
};

const QUICK_PROMPTS = [
  'Come funziona?',
  'Idee per il primo giorno',
  'Quando aggiungo voli e hotel?',
];

export function ComposerAssistantDock({
  draft,
  step,
  plannerProfile,
}: ComposerAssistantDockProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ciao! Sono il tuo assistente di viaggio — disponibile in ogni fase. Chiedimi idee, chiarimenti o cosa fare dopo.',
    },
  ]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [open, messages]);

  const sendMessage = async (raw: string) => {
    const message = raw.trim();
    if (!message || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: message,
    };

    setMessages((prev) => [...prev, userMsg]);
    setText('');
    setSending(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== 'welcome')
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/composer/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history,
          draft,
          step,
          plannerProfile,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: data.error ?? 'Risposta non disponibile, riprova tra poco.',
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          source: data.source,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: 'Errore di rete — riprova.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="composer-assistant-dock fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="composer-assistant-panel w-[min(400px,calc(100vw-2.5rem))] h-[min(520px,calc(100vh-8rem))] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="composer-assistant-header flex items-center gap-3 px-5 py-4 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/20">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">Assistente viaggio</p>
                <p className="text-xs text-white/55 truncate">Sempre disponibile · fase {step}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 composer-scroll">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'composer-assistant-bubble-user text-white'
                        : 'composer-assistant-bubble-bot text-white/90'
                    }`}
                  >
                    {msg.content}
                    {msg.source === 'ai' && (
                      <span className="block text-[10px] text-accent/70 mt-1">AI</span>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="composer-assistant-bubble-bot rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-white/50" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {messages.length <= 2 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="text-xs rounded-full px-3 py-1.5 composer-assistant-chip text-white/75 hover:text-white"
                    onClick={() => void sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="shrink-0 border-t border-white/10 p-3 flex gap-2 bg-black/20">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Chiedi qualsiasi cosa sul viaggio…"
                className="rounded-full composer-field text-white border-white/15 h-11"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(text);
                  }
                }}
                disabled={sending}
              />
              <Button
                type="button"
                size="icon"
                className="rounded-full h-11 w-11 shrink-0"
                onClick={() => void sendMessage(text)}
                disabled={sending || !text.trim()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="button"
        size="lg"
        className={`composer-assistant-fab rounded-full h-14 px-5 shadow-xl font-semibold gap-2 ${
          open ? 'opacity-90' : ''
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="hidden sm:inline">{open ? 'Chiudi chat' : 'Assistente'}</span>
      </Button>
    </div>
  );
}