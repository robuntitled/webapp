import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type VerifiedBadgesProps = {
  /** Unica spunta trust: telefono verificato (non email) */
  phoneVerified?: boolean;
  className?: string;
  size?: 'sm' | 'md';
};

/**
 * Badge fiducia: solo telefono verificato (spunta blu).
 * Registrazione email / OAuth non danno questa spunta.
 */
export function VerifiedBadges({
  phoneVerified,
  className,
  size = 'sm',
}: VerifiedBadgesProps) {
  if (!phoneVerified) return null;

  const text = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const pad = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Badge
        variant="secondary"
        className={cn(
          'rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:border-sky-400/40 dark:bg-sky-500/20 dark:text-sky-100 font-semibold gap-1',
          text,
          pad
        )}
        title="Numero verificato — può creare e unirsi a viaggi"
      >
        <BadgeCheck className="h-3.5 w-3.5 fill-sky-400/30 text-sky-600 dark:text-sky-300" />
        Verificato
      </Badge>
    </div>
  );
}
