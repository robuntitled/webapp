import { BadgeCheck, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type VerifiedBadgesProps = {
  phoneVerified?: boolean;
  emailVerified?: boolean;
  className?: string;
  size?: 'sm' | 'md';
};

/**
 * Badge fiducia viaggiatore (visibili su profilo / card).
 */
export function VerifiedBadges({
  phoneVerified,
  emailVerified,
  className,
  size = 'sm',
}: VerifiedBadgesProps) {
  if (!phoneVerified && !emailVerified) return null;

  const text = size === 'sm' ? 'text-[10px]' : 'text-xs';
  const pad = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {phoneVerified && (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-200 font-semibold gap-1',
            text,
            pad
          )}
          title="Numero di telefono verificato"
        >
          <Phone className="h-3 w-3" />
          Telefono verificato
        </Badge>
      )}
      {emailVerified && (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border border-sky-500/30 bg-sky-500/15 text-sky-200 font-semibold gap-1',
            text,
            pad
          )}
          title="Email confermata"
        >
          <BadgeCheck className="h-3 w-3" />
          Email verificata
        </Badge>
      )}
    </div>
  );
}
