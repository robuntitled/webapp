'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Cookie, FileText, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const DOCS = [
  { href: '/privacy', label: 'Privacy', Icon: Shield },
  { href: '/termini', label: 'Termini', Icon: FileText },
  { href: '/cookie', label: 'Cookie', Icon: Cookie },
] as const;

export function LegalDocNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Documenti legali"
      className={cn('flex flex-wrap items-center gap-1 rounded-full border border-slate-200/90 bg-white p-1 shadow-sm', className)}
    >
      {DOCS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              active
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
