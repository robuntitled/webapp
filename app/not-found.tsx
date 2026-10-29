import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <BrandLogo size={40} />
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-stone-900">
        Pagina non trovata
      </h1>
      <p className="mt-2 max-w-md text-sm text-stone-600">
        Il link non esiste o il viaggio non è più disponibile.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Torna alla home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/destinazioni">Esplora destinazioni</Link>
        </Button>
      </div>
    </main>
  );
}
