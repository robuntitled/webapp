'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Luggage,
  Map,
  MessageCircle,
  Plane,
  PlusCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HUB_DOORS_JOIN,
  HUB_DOORS_ORGANIZE,
  type RoleMode,
} from '@/lib/nav/routes';
import { readRoleMode, writeRoleMode } from '@/lib/nav/role-mode';
import { ScrollReveal } from '@/components/animations/ScrollReveal';

const ICONS: Record<string, LucideIcon> = {
  scopri: Compass,
  organizza: PlusCircle,
  'i-miei': Luggage,
  prenota: Plane,
};

type HubClientProps = {
  firstName: string;
};

export function HubClient({ firstName }: HubClientProps) {
  const [mode, setMode] = useState<RoleMode>('join');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMode(readRoleMode());
    setHydrated(true);
  }, []);

  const doors = useMemo(
    () => (mode === 'organize' ? HUB_DOORS_ORGANIZE : HUB_DOORS_JOIN),
    [mode]
  );

  const setRole = (next: RoleMode) => {
    setMode(next);
    writeRoleMode(next);
  };

  const primaryCta =
    mode === 'organize'
      ? { href: doors[0].href, label: 'Crea itinerario' }
      : { href: doors[0].href, label: 'Trova un viaggio' };

  return (
    <div className="relative z-0 container mx-auto px-4 pt-10 pb-24 max-w-5xl">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <ScrollReveal variant="decor">
            <p className="text-accent font-medium text-sm uppercase tracking-widest mb-2">
              Il tuo hub
            </p>
          </ScrollReveal>
          <ScrollReveal variant="title">
            <h1 className="font-display text-3xl md:text-5xl font-semibold text-white leading-tight">
              Ciao{firstName ? `, ${firstName}` : ''}
            </h1>
          </ScrollReveal>
          <ScrollReveal variant="title" stagger={1}>
            <p className="mt-3 text-white/70 max-w-xl">
              Scegli cosa fare. Lo switch cambia solo l’ordine e le CTA — i tuoi
              viaggi restano gli stessi.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal variant="card">
          <div
            className={cn(
              'inline-flex rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-md',
              !hydrated && 'opacity-70'
            )}
            role="group"
            aria-label="Modalità hub"
          >
            <button
              type="button"
              onClick={() => setRole('join')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                mode === 'join'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-white/80 hover:text-white'
              )}
            >
              Unirmi
            </button>
            <button
              type="button"
              onClick={() => setRole('organize')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                mode === 'organize'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-white/80 hover:text-white'
              )}
            >
              Organizzare
            </button>
          </div>
        </ScrollReveal>
      </div>

      <ScrollReveal variant="card">
        <Link
          href={primaryCta.href}
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent/15 px-5 py-4 text-white backdrop-blur-md transition hover:bg-accent/25"
        >
          <span className="font-medium">{primaryCta.label}</span>
          <Map className="h-5 w-5 opacity-80" />
        </Link>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
        {doors.map((door, i) => {
          const Icon = ICONS[door.id] ?? Compass;
          const featured = i === 0;
          return (
            <ScrollReveal key={door.id} variant="card" stagger={Math.min(i, 3)}>
              <Link
                href={door.href}
                className={cn(
                  'group flex h-full flex-col rounded-2xl border p-6 transition',
                  'bg-white/10 backdrop-blur-md border-white/15 hover:bg-white/15 hover:border-white/30',
                  featured && 'sm:col-span-2 md:col-span-1 ring-1 ring-accent/40'
                )}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white group-hover:scale-105 transition">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-accent">
                  {door.label}
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-white">
                  {door.title}
                </h2>
                <p className="mt-2 text-sm text-white/65 leading-relaxed flex-1">
                  {door.description}
                </p>
                <span className="mt-4 text-sm font-medium text-white/90 group-hover:underline">
                  Apri →
                </span>
              </Link>
            </ScrollReveal>
          );
        })}
      </div>

      <ScrollReveal variant="card" stagger={4}>
        <Link
          href="/messaggi"
          className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 hover:text-white hover:border-white/25 transition"
        >
          <MessageCircle className="h-4 w-4" />
          Messaggi e chat dei tuoi viaggi
        </Link>
      </ScrollReveal>
    </div>
  );
}
