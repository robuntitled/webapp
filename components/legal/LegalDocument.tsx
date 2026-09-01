import type { ReactNode } from 'react';
import { Cookie, FileText, Shield } from 'lucide-react';
import { LegalDocNav } from '@/components/legal/LegalDocNav';
import { cn } from '@/lib/utils';

export type LegalDocumentKind = 'privacy' | 'terms' | 'cookie';

const KIND_META: Record<
  LegalDocumentKind,
  { label: string; Icon: typeof Shield; accent: string; iconBg: string }
> = {
  privacy: {
    label: 'Protezione dati',
    Icon: Shield,
    accent: 'from-primary/10 to-primary/[0.02]',
    iconBg: 'bg-primary/10 text-primary',
  },
  terms: {
    label: 'Condizioni d\'uso',
    Icon: FileText,
    accent: 'from-slate-900/[0.04] to-primary/[0.03]',
    iconBg: 'bg-slate-900/[0.06] text-slate-800',
  },
  cookie: {
    label: 'Tracciamento',
    Icon: Cookie,
    accent: 'from-accent/10 to-accent/[0.02]',
    iconBg: 'bg-accent/12 text-accent',
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

export function LegalDocument({
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
    <article className="nl-page py-8 pb-16 md:py-12 md:pb-20">
      <header
        className={cn(
          'relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br p-6 shadow-sm ring-1 ring-slate-900/[0.02] md:p-9',
          meta.accent
        )}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/40 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/[0.04]',
                meta.iconBg
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {meta.label}
              </p>
              <h1 className="mt-1 font-display text-[clamp(1.65rem,1.2rem+1.4vw,2.35rem)] font-semibold leading-tight tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="mt-2 inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur-sm">
                Aggiornato: {lastUpdated}
              </p>
            </div>
          </div>
          <LegalDocNav className="hidden shrink-0 lg:flex" />
        </div>
        <p className="relative mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-[0.9375rem]">
          Documento informativo redatto in conformità alla normativa europea (GDPR) e alla legge
          italiana. Per richieste o chiarimenti usa i contatti indicati nelle sezioni dedicate.
        </p>
      </header>

      {notice ? <div className="mt-6">{notice}</div> : null}

      <div className="legal-prose mt-8 space-y-4 md:mt-10 md:space-y-5">{children}</div>
    </article>
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
  const { number, label } = parseSectionTitle(title);
  const sectionId = id ?? slugify(title);

  return (
    <section
      id={sectionId}
      className={cn(
        'scroll-mt-[calc(var(--nl-nav-height)+1.25rem)] rounded-2xl border bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.02] md:p-8',
        highlight
          ? 'border-primary/20 bg-gradient-to-br from-primary/[0.03] to-white'
          : 'border-slate-200/80'
      )}
    >
      <h2 className="flex items-start gap-3 font-display text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
        {number ? (
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
            aria-hidden
          >
            {number}
          </span>
        ) : null}
        <span>{number ? label : title}</span>
      </h2>
      <div className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-slate-700 [&_li]:leading-relaxed [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
