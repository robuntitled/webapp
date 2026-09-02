'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WorkspaceStatusCard({
  icon: Icon,
  title,
  subtitle,
  complete = false,
  actionLabel,
  onAction,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  complete?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'ws-widget overflow-hidden rounded-2xl transition hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start gap-3 border-b border-slate-100/90 px-4 py-3.5">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            complete ? 'bg-primary/12 text-primary' : 'bg-slate-100 text-slate-400'
          )}
        >
          {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="space-y-3 p-4">
        {children}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="group inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 rounded-md"
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </button>
        ) : null}
      </div>
    </article>
  );
}
