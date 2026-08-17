'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { COOKIE_CONSENT_KEY } from '@/lib/privacy/constants';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    document.cookie = `${COOKIE_CONSENT_KEY}=accepted; path=/; max-age=31536000; SameSite=Lax`;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consenso cookie"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
    >
      <p className="text-sm text-slate-700">
        Solo cookie tecnici di sessione.{' '}
        <Link href="/cookie" className="underline underline-offset-2">
          Cookie Policy
        </Link>
      </p>
      <Button onClick={accept} size="sm" className="mt-3 rounded-full">
        Ok
      </Button>
    </div>
  );
}
