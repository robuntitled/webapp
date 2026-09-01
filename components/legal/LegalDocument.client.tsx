'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { Cookie, FileText, Shield } from 'lucide-react';
import { LegalRelatedDocs } from '@/components/legal/LegalRelatedDocs';
import type { LegalDocumentKind } from '@/components/legal/legal-document-types';
import { cn } from '@/lib/utils';

const LegalKindContext = createContext<LegalDocumentKind>('privacy');

const KIND_META: Record<
  LegalDocumentKind,
  {
    label: string;
    Icon: typeof Shield;
    heroMesh: string;
    heroRing: string;
    iconBg: string;
    accentBar: string;
    numberTone: string;
  }
> = {
  privacy: {
    label: 'Protezione dati personali',
    Icon: Shield,
    heroMesh: 'from-primary/[0.14] via-teal-50/80 to-white',
    heroRing: 'ring-primary/10',
    iconBg: 'bg-primary text-white shadow-[0_8px_20px_-6px_rgba(15,118,110,0.45)]',
    accentBar: 'from-primary via-teal-500 to-primary/30',
    numberTone: 'text-primary/25',
  },
  terms: {
    label: 'Condizioni d\'uso',
    Icon: FileText,
    heroMesh: 'from-slate-200/50 via-white to-primary/[0.04]',
    heroRing: 'ring-slate-900/[0.06]',
    iconBg: 'bg-slate-900 text-white shadow-[0_8px_20px_-6px_rgba(15,23,42,0.35)]',
    accentBar: 'from-slate-800 via-slate-600 to-slate-400/40',
    numberTone: 'text-slate-300',
  },
  cookie: {
    label: 'Cookie e tracciamento',
    Icon: Cookie,
    heroMesh: 'from-accent/[0.12] via-orange-50/70 to-white',
    heroRing: 'ring-accent/15',
    iconBg: 'bg-accent text-white shadow-[0_8px_20px_-6px_rgba(249,115,22,0.4)]',
    accentBar: 'from-accent via-orange-400 to-accent/30',
    numberTone: 'text-accent/30',
  },
};

function parseSectionTitle(title: string) {
  const match = title.match(/^(\d+)\.\s*(.+)$/);
  if (!match) return { number: null as string | null, label: title };
  return { number: match[1], label: match[2] };
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function LegalDocumentShell({
  kind,
  title,
  lastUpdated,
  notice,
  children,
}: {
  kind: LegalDocumentKind;
  title: string;
  lastUpdated: string;
  notice?: ReactNode;
  children: ReactNode;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.Icon;

  return (
    <LegalKindContext.Provider value={kind}>
      <div className="nl-page w-full min-w-0">
        <article className="mx-auto w-full max-w-3xl py-10 pb-16 md:py-14 md:pb-20">
        <header
          className={cn(
            'relative overflow-hidden rounded-[1.5rem] border border-white/80 bg-gradient-to-br p-7 shadow-[0_2px_8px_rgba(15,23,42,0.04),0_20px_48px_-12px_rgba(15,23,42,0.08)] ring-1 md:p-10',
            meta.heroMesh,
            meta.heroRing
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,black,transparent)]"
            aria-hidden
          />
          <div className="relative">
            <div className="flex items-start gap-5">
              <div
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
                  meta.iconBg
                )}
              >
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {meta.label}
                </p>
                <h1 className="mt-2 font-display text-[clamp(1.75rem,1.25rem+1.5vw,2.5rem)] font-semibold leading-[1.12] tracking-tight text-slate-950">
                  {title}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                    Ultimo aggiornamento · {lastUpdated}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-900/[0.04] px-3 py-1 text-xs font-medium text-slate-500">
                    GDPR · Legge italiana
                  </span>
                </div>
              </div>
            </div>
            <p className="relative mt-6 max-w-2xl border-t border-slate-900/[0.06] pt-5 text-[0.9375rem] leading-[1.65] text-slate-600">
              Documento informativo redatto in conformità alla normativa europea e italiana. Per
              richieste o chiarimenti utilizza i recapiti indicati nelle sezioni dedicate.
            </p>
          </div>
        </header>

        {notice ? <div className="mt-6">{notice}</div> : null}

        <div className="mt-9 space-y-5 md:mt-11 md:space-y-6">{children}</div>

        <LegalRelatedDocs current={kind} />
        </article>
      </div>
    </LegalKindContext.Provider>
  );
}

export function LegalSection({
  title,
  id,
  children,
  highlight,
}: {
  title: string;
  id?: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  const kind = useContext(LegalKindContext);
  const meta = KIND_META[kind];
  const { number, label } = parseSectionTitle(title);
  const sectionId = id ?? slugify(title);

  return (
    <section
      id={sectionId}
      className={cn(
        'group relative scroll-mt-[calc(var(--nl-nav-height)+1rem)] overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_-8px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.04] transition hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_40px_-10px_rgba(15,23,42,0.08)]',
        highlight && 'ring-primary/15'
      )}
    >
      <div
        className={cn('absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b', meta.accentBar)}
        aria-hidden
      />
      <div className="px-6 py-6 md:px-8 md:py-8">
        <div className="flex items-start gap-4 md:gap-5">
          {number ? (
            <span
              className={cn(
                'select-none font-display text-[2.25rem] font-light leading-none tabular-nums md:text-[2.5rem]',
                meta.numberTone
              )}
              aria-hidden
            >
              {number.padStart(2, '0')}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[1.125rem] font-semibold tracking-tight text-slate-950 md:text-xl">
              {number ? label : title}
            </h2>
            <div
              className={cn(
                'mt-4 space-y-3 text-[0.9375rem] leading-[1.7] text-slate-600',
                '[&_li]:leading-[1.65] [&_p+p]:mt-3.5 [&_strong]:font-semibold [&_strong]:text-slate-900',
                '[&_ul]:mt-2.5 [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:marker:text-primary/50'
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
