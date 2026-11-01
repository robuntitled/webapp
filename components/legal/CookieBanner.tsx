'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { persistCookieConsent, readCookieConsent } from '@/lib/privacy/cookie-consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readCookieConsent()) setVisible(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (visible) {
      root.style.setProperty('--cookie-banner-pad', '3.25rem');
      root.dataset.cookieBanner = '1';
    } else {
      root.style.removeProperty('--cookie-banner-pad');
      delete root.dataset.cookieBanner;
    }
    return () => {
      root.style.removeProperty('--cookie-banner-pad');
      delete root.dataset.cookieBanner;
    };
  }, [visible]);

  const accept = () => {
    persistCookieConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consenso cookie"
      className="fixed inset-x-0 bottom-0 z-[60] flex items-center gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-sm sm:inset-x-auto sm:bottom-[max(0.5rem,env(safe-area-inset-bottom))] sm:left-auto sm:right-4 sm:max-w-xs sm:rounded-2xl sm:border"
    >
      <p className="min-w-0 flex-1 text-[11px] leading-snug text-slate-700 sm:text-xs">
        Solo cookie tecnici.{' '}
        <Link href="/cookie" className="underline underline-offset-2">
          Policy
        </Link>
      </p>
      <Button type="button" onClick={accept} size="sm" variant="outline" className="h-10 shrink-0 rounded-full px-4 touch-manipulation">
        Ok
      </Button>
    </div>
  );
}
