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
    iconBg: string;
    accentBar: string;
    numberBg: string;
  }
> = {
  privacy: {
    label: 'Protezione dati personali',
    Icon: Shield,
    heroMesh: 'from-primary/[0.08] via-white to-white',
    iconBg: 'bg-primary text-white shadow-[0_4px_14px_-4px_rgba(15,118,110,0.5)]',
    accentBar: 'from-primary to-primary/40',
    numberBg: 'bg-primary/10 text-primary',
  },
  terms: {
    label: 'Condizioni d\'uso',
    Icon: FileText,
    heroMesh: 'from-slate-100/80 via-white to-white',
    iconBg: 'bg-slate-900 text-white shadow-[0_4px_14px_-4px_rgba(15,23,42,0.35)]',
    accentBar: 'from-slate-700 to-slate-400/50',
    numberBg: 'bg-slate-900/[0.06] text-slate-700',
  },
  cookie: {
    label: 'Cookie e tracciamento',
    Icon: Cookie,
    heroMesh: 'from-accent/[0.08] via-white to-white',
    iconBg: 'bg-accent text-white shadow-[0_4px_14px_-4px_rgba(249,115,22,0.45)]',
    accentBar: 'from-accent to-accent/40',
    numberBg: 'bg-accent/12 text-accent',
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
        <article className="w-full py-6 pb-12 md:py-8 md:pb-14">
          <header
            className={cn(
              'relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-10px_rgba(15,23,42,0.06)] md:p-6',
              meta.heroMesh
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.025)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]"
              aria-hidden
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  meta.iconBg
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {meta.label}
                </p>
                <h1 className="mt-1 font-display text-[clamp(1.5rem,1.1rem+1.1vw,2rem)] font-semibold leading-tight tracking-tight text-slate-950">
                  {title}
                </h1>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    Aggiornato · {lastUpdated}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-900/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                    GDPR · Legge italiana
                  </span>
                </div>
                <p className="mt-3 max-w-3xl text-[0.875rem] leading-relaxed text-slate-600">
                  Documento informativo in conformità alla normativa europea e italiana. Per richieste
                  usa i recapiti nelle sezioni dedicate.
                </p>
              </div>
            </div>
          </header>

          {notice ? <div className="mt-4">{notice}</div> : null}

          <div className="mt-5 space-y-3 md:mt-6 md:space-y-3.5">{children}</div>

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
        'group relative scroll-mt-[calc(var(--nl-nav-height)+0.75rem)] overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
        highlight && 'border-primary/20 bg-primary/[0.02]'
      )}
    >
      <div
        className={cn('absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b', meta.accentBar)}
        aria-hidden
      />
      <div className="px-4 py-4 sm:px-5 sm:py-4.5">
        <div className="flex items-start gap-3">
          {number ? (
            <span
              className={cn(
                'mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-bold tabular-nums',
                meta.numberBg
              )}
              aria-hidden
            >
              {number.padStart(2, '0')}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[1rem] font-semibold tracking-tight text-slate-950 sm:text-[1.0625rem]">
              {number ? label : title}
            </h2>
            <div
              className={cn(
                'mt-2.5 space-y-2.5 text-[0.875rem] leading-relaxed text-slate-600',
                '[&_li]:leading-relaxed [&_p+p]:mt-2.5 [&_strong]:font-semibold [&_strong]:text-slate-900',
                '[&_ul]:mt-2 [&_ul]:space-y-1.5 [&_ul]:pl-4 [&_ul]:marker:text-primary/45'
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
