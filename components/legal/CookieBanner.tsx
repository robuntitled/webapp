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
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-white/95 dark:bg-slate-950/95 backdrop-blur p-4 shadow-lg"
    >
      <div className="container mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between max-w-4xl">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Utilizziamo cookie tecnici necessari al funzionamento del sito (sessione di login).
          Per maggiori informazioni consulta la{' '}
          <Link href="/cookie" className="text-blue-600 hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
        <Button onClick={accept} className="shrink-0">
          Accetta
        </Button>
      </div>
    </div>
  );
}