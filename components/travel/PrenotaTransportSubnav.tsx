'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bus, CarTaxiFront, TrainFront } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUBS = [
  { href: '/prenota/trasporti/bus', label: 'Bus', icon: Bus },
  { href: '/prenota/trasporti/treni', label: 'Treni', icon: TrainFront },
  { href: '/prenota/trasporti/taxi', label: 'Taxi', icon: CarTaxiFront },
] as const;

export function PrenotaTransportSubnav() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {SUBS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
              active
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
