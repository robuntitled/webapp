import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Supporto — Noivia',
  description: 'Aiuto su Noivia: domande frequenti e come funziona.',
  robots: { index: false, follow: false },
};

/**
 * Support page — no invented email. Points to FAQ until a real channel exists.
 */
export default function SupportoPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-page,#F6F7FB)]">
      <div className="nl-page w-full space-y-6 py-12">
        <h1 className="font-display text-3xl font-extrabold text-[var(--color-text)]">
          Supporto
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Per ora consulta le domande frequenti e Come funziona. Un canale di contatto dedicato
          sarà pubblicato qui quando sarà disponibile.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-[10px]">
            <Link href="/domande-frequenti">Domande frequenti</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-[10px]">
            <Link href="/come-funziona">Come funziona</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-[10px]">
            <Link href="/">Torna alla home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
