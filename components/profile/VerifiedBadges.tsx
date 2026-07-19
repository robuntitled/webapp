import { BadgeCheck, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type VerifiedBadgesProps = {
  phoneVerified?: boolean;
  emailVerified?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  /** Mostra anche etichette testuali (profilo pubblico) */
  showLabels?: boolean;
};

/**
 * Badge fiducia: telefono (primario) + email (secondario).
 */
export function VerifiedBadges({
  phoneVerified,
  emailVerified,
  className,
  size = 'sm',
  showLabels = true,
}: VerifiedBadgesProps) {
  if (!phoneVerified && !emailVerified) return null;

  const text = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const pad = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {phoneVerified ? (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border border-sky-500/35 bg-sky-500/12 text-sky-800 dark:border-sky-400/40 dark:bg-sky-500/20 dark:text-sky-100 font-semibold gap-1',
            text,
            pad
          )}
          title="Numero verificato — può creare e unirsi a viaggi"
        >
          <BadgeCheck className={cn(icon, 'fill-sky-400/30 text-sky-600 dark:text-sky-300')} />
          {showLabels ? 'Telefono verificato' : 'Verificato'}
        </Badge>
      ) : null}
      {emailVerified ? (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border border-teal-600/25 bg-teal-500/10 text-teal-800 dark:border-teal-400/35 dark:bg-teal-500/15 dark:text-teal-100 font-semibold gap-1',
            text,
            pad
          )}
          title="Email confermata"
        >
          <Mail className={cn(icon, 'text-teal-700 dark:text-teal-300')} />
          {showLabels ? 'Email verificata' : 'Email'}
        </Badge>
      ) : null}
    </div>
  );
}
