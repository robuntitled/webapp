'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { CompanyProfile } from '@/lib/privacy/company';

function hideSiteFooter(pathname: string | null): boolean {
  if (!pathname) return false;
  // Auth / onboarding / workspace immersivi: niente footer.
  // Home e itinerario pubblici lo mostrano (navigazione e fiducia).
  if (pathname === '/accedi') return true;
  if (pathname.startsWith('/pratica')) return true;
  if (pathname.startsWith('/onboarding')) return true;
  if (pathname.startsWith('/completa-registrazione')) return true;
  if (/^\/partenze\/[^/]+/.test(pathname)) return true;
  return false;
}

type FooterProps = {
  company: CompanyProfile;
};

export function Footer({ company }: FooterProps) {
  const pathname = usePathname();
  if (hideSiteFooter(pathname)) return null;

  return (
    <footer className="mt-auto border-t border-border bg-card text-foreground">
      <div className="nl-page py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="mb-4">
              <BrandLogo size={40} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Viaggi nel mondo in solo, con amici o in gruppo.
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

          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link
              href="/destinazioni"
              className="inline-flex min-h-11 items-center text-primary transition-colors hover:text-[var(--color-primary-hover)]"
            >
              Cerca viaggi
            </Link>
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center text-primary transition-colors hover:text-[var(--color-primary-hover)]"
            >
              Privacy
            </Link>
            <Link
              href="/termini"
              className="inline-flex min-h-11 items-center text-primary transition-colors hover:text-[var(--color-primary-hover)]"
            >
              Termini
            </Link>
            <Link
              href="/cookie"
              className="inline-flex min-h-11 items-center text-primary transition-colors hover:text-[var(--color-primary-hover)]"
            >
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
