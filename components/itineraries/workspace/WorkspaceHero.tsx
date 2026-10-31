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
    'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3.5 py-2 text-sm font-medium text-white/95 backdrop-blur-md transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50';

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

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:gap-3 sm:p-5">
          {onBack ? (
            <button type="button" onClick={onBack} className={backClassName}>
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[9.5rem] truncate sm:max-w-none">{backLabel}</span>
            </button>
          ) : backHref ? (
            <Link href={backHref} className={backClassName}>
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[9.5rem] truncate sm:max-w-none">{backLabel}</span>
            </Link>
          ) : null}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 space-y-2 p-3 pt-12 sm:space-y-0 sm:p-6 sm:pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 sm:text-[11px] sm:tracking-[0.18em]">
            {eyebrow}
          </p>
          <h1 className="font-display text-[clamp(1.45rem,3.5vw,2.5rem)] font-semibold leading-[1.08] tracking-tight text-white">
            {destinationName}
          </h1>
          {meta ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80 sm:mt-2 sm:gap-x-4 sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-white/60" aria-hidden />
                {meta}
              </span>
            </p>
          ) : null}
          {chips ? (
            <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">{chips}</div>
          ) : null}
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
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-medium leading-tight text-white/90 backdrop-blur-sm sm:px-2.5 sm:text-xs">
      {Icon ? <Icon className="h-3 w-3 shrink-0 text-white/70" aria-hidden /> : null}
      <span className="min-w-0">{children}</span>
    </span>
  );
}
