'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PRENOTA_LINKS = [
  { href: '/prenota/voli', label: 'Voli' },
  { href: '/prenota/hotel', label: 'Hotel' },
  { href: '/prenota/auto', label: 'Noleggio auto' },
  { href: '/prenota/attrazioni', label: 'Attrazioni' },
  { href: '/prenota/attivita', label: 'Attività' },
] as const;

const TRANSPORT_LINKS = [
  { href: '/prenota/trasporti/bus', label: 'Bus' },
  { href: '/prenota/trasporti/treni', label: 'Treni' },
  { href: '/prenota/trasporti/taxi', label: 'Taxi' },
] as const;

export function PrenotaNavMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground">
        Prenota servizi
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {PRENOTA_LINKS.slice(0, 3).map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Trasporti</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {TRANSPORT_LINKS.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {PRENOTA_LINKS.slice(3).map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
