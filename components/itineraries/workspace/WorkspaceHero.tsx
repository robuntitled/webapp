'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Users } from 'lucide-react';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { cn } from '@/lib/utils';

type WorkspaceHeroProps = {
  destinationSlug: string;
  destinationName: string;
  eyebrow: string;
  meta?: string;
  backHref?: string;
  backLabel: string;
  onBack?: () => void;
  action?: React.ReactNode;
  chips?: React.ReactNode;
  className?: string;
};

export function WorkspaceHero({
  destinationSlug,
  destinationName,
  eyebrow,
  meta,
  backHref,
  backLabel,
  onBack,
  action,
  chips,
  className,
}: WorkspaceHeroProps) {
  const cover = coverForDestination(destinationSlug);

  const backClassName =
    'inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-sm font-medium text-white/95 backdrop-blur-md transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50';

  return (
    <section className={cn('relative overflow-hidden rounded-2xl sm:rounded-3xl', className)}>
      <div className="relative aspect-[2.6/1] min-h-[10.5rem] w-full sm:min-h-[12.5rem]">
        <Image
          src={cover}
          alt={destinationName}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 72rem"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/45 to-slate-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(15,118,110,0.35),transparent_55%)]" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 sm:p-5">
          {onBack ? (
            <button type="button" onClick={onBack} className={backClassName}>
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </button>
          ) : backHref ? (
            <Link href={backHref} className={backClassName}>
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
          ) : null}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            {eyebrow}
          </p>
          <h1 className="mt-1 font-display text-[clamp(1.65rem,3.5vw,2.5rem)] font-semibold leading-[1.08] tracking-tight text-white">
            {destinationName}
          </h1>
          {meta ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-white/60" aria-hidden />
                {meta}
              </span>
            </p>
          ) : null}
          {chips ? <div className="mt-3 flex flex-wrap gap-2">{chips}</div> : null}
        </div>
      </div>
    </section>
  );
}

export function WorkspaceMetaChip({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: typeof Users;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
      {Icon ? <Icon className="h-3 w-3 text-white/70" aria-hidden /> : null}
      {children}
    </span>
  );
}
