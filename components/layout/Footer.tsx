'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { CompanyProfile } from '@/lib/privacy/company';
import { isComposerPath } from '@/lib/ui/app-chrome';

type FooterProps = {
  company: CompanyProfile;
};

export function Footer({ company }: FooterProps) {
  const pathname = usePathname();
  if (pathname === '/' || isComposerPath(pathname)) return null;

  return (
    <footer className="mt-auto border-t border-border bg-card text-foreground">
      <div className="nl-page py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <BrandLogo size={40} className="ring-border" />
              <span className="font-display text-xl font-semibold">{company.tradeName}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Viaggi di gruppo nel mondo — raccontati da chi li vive e li fotografa.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Privacy:{' '}
              <a
                href={`mailto:${company.privacyEmail}`}
                className="text-primary underline underline-offset-2 hover:text-[var(--color-primary-hover)] transition-colors"
              >
                {company.privacyEmail}
              </a>
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href="/destinazioni" className="text-primary hover:text-[var(--color-primary-hover)] transition-colors">
              Cerca viaggi
            </Link>
            <Link href="/privacy" className="text-primary hover:text-[var(--color-primary-hover)] transition-colors">
              Privacy
            </Link>
            <Link href="/termini" className="text-primary hover:text-[var(--color-primary-hover)] transition-colors">
              Termini
            </Link>
            <Link href="/cookie" className="text-primary hover:text-[var(--color-primary-hover)] transition-colors">
              Cookie
            </Link>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {company.tradeName}</span>
          <span>Conforme al Regolamento UE 2016/679 (GDPR)</span>
        </div>
      </div>
    </footer>
  );
}
