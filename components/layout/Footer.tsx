'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand/BrandLogo';
import type { CompanyProfile } from '@/lib/privacy/company';
import { HOME_HREF } from '@/lib/nav/home';
import { isPlaceholder } from '@/lib/privacy/is-placeholder';

function hideSiteFooter(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/accedi') return true;
  if (pathname.startsWith('/onboarding')) return true;
  if (pathname.startsWith('/completa-registrazione')) return true;
  return false;
}

type FooterProps = {
  company: CompanyProfile;
};

/**
 * Draft content pages (Come funziona / FAQ / Regole) stay reachable by URL + noindex,
 * but are hidden from the footer while they still show BOZZA banners / placeholders.
 */
const COL = {
  noivia: [{ href: '/organizza', label: 'Mete' }],
  viaggi: [
    { href: '/organizza', label: 'Organizza' },
    { href: '/gruppi', label: 'Partenze di gruppo' },
  ],
  legale: [
    { href: '/privacy', label: 'Privacy' },
    { href: '/termini', label: 'Termini' },
    { href: '/cookie', label: 'Cookie' },
  ],
} as const;

function Col({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string; testId?: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
        {title}
      </p>
      <ul className="mt-3 space-y-1">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:text-[var(--color-primary-hover)]"
              data-testid={l.testId}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer({ company }: FooterProps) {
  const pathname = usePathname();
  if (hideSiteFooter(pathname)) return null;

  const showPrivacyEmail = !isPlaceholder(company.privacyEmail);
  const legalLineParts = [
    !isPlaceholder(company.companyName) ? company.companyName : null,
    !isPlaceholder(company.vatId) ? `P.IVA ${company.vatId}` : null,
    !isPlaceholder(company.addressLine) ? company.addressLine : null,
  ].filter(Boolean);

  return (
    <footer className="mt-auto border-t border-border bg-card text-foreground">
      <div className="nl-page py-12">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
          <div className="max-w-sm">
            <Link
              href={HOME_HREF}
              className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Noivia — home"
              data-testid="footer-logo-home"
            >
              <BrandLogo size={40} />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Organizza il tuo viaggio o unisciti a una partenza di gruppo.
            </p>
            {showPrivacyEmail ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Privacy:{' '}
                <a
                  href={`mailto:${company.privacyEmail}`}
                  className="text-primary underline underline-offset-2"
                >
                  {company.privacyEmail}
                </a>
              </p>
            ) : null}
          </div>
          <Col title="Noivia" links={COL.noivia} />
          <Col title="Viaggi" links={COL.viaggi} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
              Aiuto
            </p>
            <ul className="mt-3 space-y-1">
              <li>
                <Link
                  href="/supporto"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:text-[var(--color-primary-hover)]"
                  data-testid="footer-supporto"
                >
                  Supporto
                </Link>
              </li>
            </ul>
          </div>
          <Col title="Legale" links={COL.legale} />
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} {company.tradeName}
          </span>
          {legalLineParts.length > 0 ? (
            <span>{legalLineParts.join(' · ')}</span>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
