'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BedDouble, Compass, Plane, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/prenota/voli', label: 'Voli', icon: Plane },
  { href: '/prenota/hotel', label: 'Hotel', icon: BedDouble },
  { href: '/prenota/attrazioni', label: 'Attrazioni', icon: Compass },
  { href: '/prenota/attivita', label: 'Attività', icon: Ticket },
] as const;

export function PrenotaNavTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition',
              active
                ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground'
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
