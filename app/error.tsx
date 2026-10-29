'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <BrandLogo size={40} />
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-stone-900">
        Qualcosa non ha funzionato
      </h1>
      <p className="mt-2 max-w-md text-sm text-stone-600">
        Riprova tra un momento. Se il problema continua, torna alla home.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Riprova
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
