import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: 'Dev fixtures (non pubblico)',
};

/**
 * Dev/QA fixture routes: never indexable; blocked outside non-production.
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    // Production: hide entirely. Preview/local keep fixtures for Playwright.
    if (process.env.VERCEL_ENV === 'production') notFound();
  }
  return (
    <div data-robots="noindex" data-testid="dev-fixtures-shell">
      {children}
    </div>
  );
}
