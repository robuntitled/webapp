'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Cookie, FileText, Shield } from 'lucide-react';
import type { LegalDocumentKind } from '@/components/legal/legal-document-types';
import { cn } from '@/lib/utils';

const DOCS: {
  href: string;
  kind: LegalDocumentKind;
  label: string;
  description: string;
  Icon: typeof Shield;
}[] = [
  {
    href: '/privacy',
    kind: 'privacy',
    label: 'Informativa Privacy',
    description: 'Trattamento dati e diritti GDPR',
    Icon: Shield,
  },
  {
    href: '/termini',
    kind: 'terms',
    label: 'Termini di Servizio',
    description: 'Condizioni d\'uso della piattaforma',
    Icon: FileText,
  },
  {
    href: '/cookie',
    kind: 'cookie',
    label: 'Cookie Policy',
    description: 'Cookie tecnici e gestione',
    Icon: Cookie,
  },
];

const KIND_RING: Record<LegalDocumentKind, string> = {
  privacy: 'hover:ring-primary/25 group-hover:text-primary',
  terms: 'hover:ring-slate-400/30 group-hover:text-slate-900',
  cookie: 'hover:ring-accent/30 group-hover:text-accent',
};

const KIND_ICON: Record<LegalDocumentKind, string> = {
  privacy: 'bg-primary/10 text-primary',
  terms: 'bg-slate-900/[0.06] text-slate-800',
  cookie: 'bg-accent/12 text-accent',
};

export function LegalRelatedDocs({ current }: { current: LegalDocumentKind }) {
  const pathname = usePathname();

  return (
    <aside aria-label="Altri documenti legali" className="mt-12 border-t border-slate-200/80 pt-10 md:mt-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Documentazione correlata
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {DOCS.map(({ href, kind, label, description, Icon }) => {
          const active = pathname === href || current === kind;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex flex-col rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.03] transition duration-200',
                active
                  ? 'border-primary/25 ring-primary/15'
                  : cn('border-slate-200/80 hover:-translate-y-0.5 hover:shadow-md', KIND_RING[kind])
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    KIND_ICON[kind]
                  )}
                >
                  <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                </span>
                {!active ? (
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500"
                    aria-hidden
                  />
                ) : (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Attivo
                  </span>
                )}
              </div>
              <span className="mt-3 font-display text-sm font-semibold text-slate-900">{label}</span>
              <span className="mt-1 text-xs leading-relaxed text-slate-500">{description}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
