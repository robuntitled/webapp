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
      root.style.setProperty('--cookie-banner-pad', '5.5rem');
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
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:inset-x-auto sm:right-4 sm:left-auto sm:max-w-sm sm:flex-col sm:items-stretch sm:p-4"
    >
      <p className="min-w-0 flex-1 text-xs leading-snug text-slate-700 sm:text-sm">
        Solo cookie tecnici di sessione.{' '}
        <Link href="/cookie" className="underline underline-offset-2">
          Cookie Policy
        </Link>
      </p>
      <Button
        type="button"
        onClick={accept}
        size="sm"
        className="h-9 shrink-0 rounded-full px-4 touch-manipulation"
      >
        Ok
      </Button>
    </div>
  );
}
