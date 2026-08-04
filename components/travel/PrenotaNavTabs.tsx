'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BedDouble,
  Bus,
  Car,
  ChevronDown,
  Compass,
  Plane,
  Ticket,
  TrainFront,
  CarTaxiFront,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { prefetchOmioNemoBundle } from '@/lib/omio/widget-loader';

const LINK_TABS = [
  { href: '/prenota/voli', label: 'Voli', icon: Plane },
  { href: '/prenota/hotel', label: 'Hotel', icon: BedDouble },
  { href: '/prenota/auto', label: 'Noleggio auto', icon: Car },
  { href: '/prenota/attrazioni', label: 'Attrazioni', icon: Compass },
  { href: '/prenota/attivita', label: 'Attività', icon: Ticket },
] as const;

const TRANSPORT_SUBS = [
  { href: '/prenota/trasporti/bus', label: 'Bus', icon: Bus },
  { href: '/prenota/trasporti/treni', label: 'Treni', icon: TrainFront },
  { href: '/prenota/trasporti/taxi', label: 'Taxi', icon: CarTaxiFront },
] as const;

function pillClass(active: boolean) {
  return cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition',
    active
      ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
      : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground'
  );
}

export function PrenotaNavTabs() {
  const pathname = usePathname();
  const transportActive = pathname.startsWith('/prenota/trasporti');

  return (
    <div className="flex flex-wrap gap-2">
      {LINK_TABS.slice(0, 3).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={pillClass(active)}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}

      <DropdownMenu
        onOpenChange={(open) => {
          if (open) prefetchOmioNemoBundle();
        }}
      >
        <DropdownMenuTrigger
          className={cn(pillClass(transportActive), 'outline-none')}
          onMouseEnter={() => prefetchOmioNemoBundle()}
        >
          <Bus className="h-3.5 w-3.5" />
          Trasporti
          <ChevronDown className="h-3 w-3 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {TRANSPORT_SUBS.map(({ href, label, icon: Icon }) => (
            <DropdownMenuItem key={href} asChild>
              <Link href={href} className="cursor-pointer">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {LINK_TABS.slice(3).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={pillClass(active)}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
