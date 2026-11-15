import { formatEuroExact } from '@/lib/format/euro';
import { cn } from '@/lib/utils';

/** Brand `<Price>` — always grouped thousands (P1-8). */
export function Price({
  amount,
  currency = 'EUR',
  className,
  size = 'md',
}: {
  amount: number | null | undefined;
  currency?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const label = formatEuroExact(amount, currency) ?? '—';
  return (
    <span
      className={cn(
        'price font-display font-extrabold tabular-nums tracking-tight text-[var(--color-text)]',
        size === 'sm' && 'text-base',
        size === 'md' && 'text-[22px]',
        size === 'lg' && 'text-2xl sm:text-3xl',
        className
      )}
      data-testid="price"
    >
      {label}
    </span>
  );
}

export function PricePerPersonBlock({
  unit,
  party,
  pax,
  currency = 'EUR',
  className,
}: {
  unit: number;
  party: number;
  pax: number;
  currency?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-0.5', className)} data-testid="price-per-person-block">
      <Price amount={unit} currency={currency} size="md" />
      <p className="text-xs text-[var(--color-text-secondary)]">
        a persona
        {pax > 1 ? (
          <>
            {' '}
            · <span className="tabular-nums">{formatEuroExact(party, currency)}</span> totale
            tratta ({pax} {pax === 1 ? 'persona' : 'persone'})
          </>
        ) : null}
      </p>
    </div>
  );
}
