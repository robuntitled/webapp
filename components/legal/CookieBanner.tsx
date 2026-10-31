'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { COOKIE_CONSENT_KEY } from '@/lib/privacy/constants';

function readConsent(): boolean {
  try {
    const legacyKey = 'nomadlink-cookie-consent';
    const fromLs =
      localStorage.getItem(COOKIE_CONSENT_KEY) || localStorage.getItem(legacyKey);
    if (fromLs) {
      if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
        localStorage.setItem(COOKIE_CONSENT_KEY, fromLs);
      }
      return true;
    }
  } catch {
    /* private mode */
  }
  if (typeof document !== 'undefined') {
    return document.cookie.split(';').some((c) => c.trim().startsWith(`${COOKIE_CONSENT_KEY}=`));
  }
  return false;
}

function persistConsent() {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
  } catch {
    /* ignore */
  }
  document.cookie = `${COOKIE_CONSENT_KEY}=accepted; path=/; max-age=31536000; SameSite=Lax`;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readConsent()) setVisible(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (visible) {
      root.style.setProperty('--cookie-banner-pad', '4.75rem');
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
    persistConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consenso cookie"
      className="fixed inset-x-3 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-sm items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-sm sm:inset-x-auto sm:right-4 sm:left-auto sm:max-w-xs sm:flex-col sm:items-stretch sm:gap-2 sm:p-3"
    >
      <p className="min-w-0 flex-1 text-[11px] leading-snug text-slate-700 sm:text-xs">
        Solo cookie tecnici.{' '}
        <Link href="/cookie" className="underline underline-offset-2">
          Policy
        </Link>
      </p>
      <Button
        type="button"
        onClick={accept}
        size="sm"
        className="h-11 min-w-11 shrink-0 rounded-full px-4 touch-manipulation"
      >
        Ok
      </Button>
    </div>
  );
}
