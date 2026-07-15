'use client';

import { usePathname } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';

/** Hide site footer on full-viewport composer routes. */
export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard/crea')) return null;
  return <Footer />;
}
