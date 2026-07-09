import Link from 'next/link';
import Image from 'next/image';
import { getCompanyProfile } from '@/lib/privacy/company';

export function Footer() {
  const company = getCompanyProfile();

  return (
    <footer className="border-t bg-primary text-primary-foreground mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <Image src="/assets/logo.png" alt="" width={32} height={32} className="rounded-lg" />
              <span className="font-display text-xl font-semibold">{company.tradeName}</span>
            </div>
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              Viaggi di gruppo nel mondo — raccontati da chi li vive e li fotografa.
            </p>
            <p className="text-sm text-primary-foreground/60 mt-4">
              Privacy:{' '}
              <a
                href={`mailto:${company.privacyEmail}`}
                className="underline underline-offset-2 hover:text-white transition-colors"
              >
                {company.privacyEmail}
              </a>
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link href="/dashboard" className="text-primary-foreground/80 hover:text-white transition-colors">
              Cerca viaggi
            </Link>
            <Link href="/privacy" className="text-primary-foreground/80 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/termini" className="text-primary-foreground/80 hover:text-white transition-colors">
              Termini
            </Link>
            <Link href="/cookie" className="text-primary-foreground/80 hover:text-white transition-colors">
              Cookie
            </Link>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-primary-foreground/15 flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-primary-foreground/50">
          <span>© {new Date().getFullYear()} {company.tradeName}</span>
          <span>Conforme al Regolamento UE 2016/679 (GDPR)</span>
        </div>
      </div>
    </footer>
  );
}