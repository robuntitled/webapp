import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type EmptyProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  testId?: string;
};

/** Empty / 404 / invito scaduto — un solo pattern (P2). */
export function Empty({
  title,
  description,
  actionHref,
  actionLabel,
  className,
  testId = 'empty-state',
}: EmptyProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center',
        className
      )}
      data-testid={testId}
    >
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-[var(--color-text)]">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {description}
        </p>
      ) : null}
      {actionHref && actionLabel ? (
        <Button asChild variant="cta" className="mt-6 min-h-11 rounded-[10px]">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
