'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function getCheckoutReturnHref(
  practiceId: string | undefined,
  tab: 'voli' | 'hotel'
): string {
  if (practiceId) return `/pratica/${practiceId}?tab=${tab}`;
  return tab === 'hotel' ? '/prenota/hotel' : '/prenota/voli';
}

export function CheckoutBackLink({
  href,
  label = 'Torna al viaggio',
  onClick,
  className,
}: {
  href?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}) {
  const classNames = cn(
    'inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 rounded-md',
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classNames}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <Link href={href ?? '/pratiche'} className={classNames}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function CheckoutStepShell({
  step,
  totalSteps,
  title,
  description,
  children,
  footer,
}: {
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const progress = Math.round((step / totalSteps) * 100);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm"
            aria-hidden
          >
            {step}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Passo {step} di {totalSteps}
            </p>
            <h2 className="mt-0.5 font-display text-xl font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
            ) : null}
          </div>
        </div>
        <div
          className="mt-4 h-1 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="space-y-4 p-5 sm:p-6">{children}</div>
      {footer ? (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">{footer}</div>
      ) : null}
    </div>
  );
}
