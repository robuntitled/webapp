import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Supporto',
  description: 'Canale di assistenza Noivia (placeholder — in definizione).',
  robots: { index: true, follow: true },
};

/**
 * Support channel placeholder — owner must choose the real contact.
 * Do not invent an email address.
 */
export default function SupportoPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="nl-page w-full space-y-6 py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
          Placeholder · in attesa decisione owner
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[var(--color-text)]">
          Supporto
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Il canale di assistenza ufficiale non è ancora pubblicato. Non è disponibile un
          indirizzo email di contatto in questa versione. Quando il canale sarà definito
          (email, form o chat), lo troverai qui.
        </p>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Nessuna email inventata</p>
          <p className="mt-1 text-amber-900/90">
            Per decisioni bloccanti (canale supporto, dati societari, garanzia insolvenza)
            serve conferma dell&apos;owner. Intanto puoi tornare alla home o ad Accedi.
          </p>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Canale:{' '}
          <span className="nl-content-placeholder inline rounded-md bg-amber-100/90 px-1.5 py-0.5 font-mono text-[0.92em] font-semibold text-amber-950 ring-1 ring-amber-300/70">
            {'{canale assistenza}'}
          </span>
          ,{' '}
          <span className="nl-content-placeholder inline rounded-md bg-amber-100/90 px-1.5 py-0.5 font-mono text-[0.92em] font-semibold text-amber-950 ring-1 ring-amber-300/70">
            {'{orari}'}
          </span>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-[10px]">
            <Link href="/">Torna alla home</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-[10px]">
            <Link href="/domande-frequenti">Domande frequenti</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-[10px]">
            <Link href="/accedi">Accedi</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
