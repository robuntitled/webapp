import type { Metadata } from 'next';
import Link from 'next/link';
import { BozzaBanner } from '@/components/content/BozzaBanner';
import { withPlaceholders } from '@/components/content/ContentPlaceholder';
import { FAQ_SECTIONS } from '@/lib/content/faq';
import { pageOpenGraph } from '@/lib/brand/seo';

const TITLE = 'Domande frequenti';
const DESCRIPTION =
  'Chi vende voli e hotel, cosa paghi a Noivia, come funzionano le partenze di gruppo, gli inviti, la chat e come eliminare il tuo account.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/domande-frequenti' },
  robots: { index: true, follow: true },
  openGraph: pageOpenGraph('/domande-frequenti', TITLE, DESCRIPTION),
};

/**
 * Native details/summary keeps answers in the DOM when closed (SEO + a11y).
 * No FAQPage JSON-LD while placeholders / ⚠️ / 🔒 items remain unresolved.
 */
export default function DomandeFrequentiPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="nl-page w-full space-y-10 py-12">
        <BozzaBanner>
          Testo in bozza: da rilettura di Legale. Domande non pubblicabili (eliminazione account,
          chat, Segnala/Blocca, ricerca persone) sono omesse finché codice e dati non sono pronti.
        </BozzaBanner>

        <header className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            Aiuto
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-4xl">
            Domande frequenti
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Risposte su chi vende i servizi, cosa paghi, inviti e partenze di gruppo. Per i dettagli
            operativi vedi anche{' '}
            <Link
              href="/come-funziona"
              className="font-semibold text-primary underline underline-offset-2 hover:text-[var(--color-primary-hover)]"
            >
              Come funziona
            </Link>
            .
          </p>
        </header>

        {FAQ_SECTIONS.map((section) => (
          <section key={section.id} className="max-w-2xl space-y-3">
            <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
              {section.title}
            </h2>
            <div className="divide-y divide-border rounded-2xl border border-border">
              {section.items.map((item) => (
                <details key={item.id} className="group px-4 py-1 open:bg-slate-50/60">
                  <summary className="cursor-pointer list-none py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                    <h3 className="flex items-start justify-between gap-3 text-sm font-semibold text-[var(--color-text)]">
                      <span>{item.question}</span>
                      <span
                        aria-hidden
                        className="mt-0.5 shrink-0 text-base leading-none text-[var(--color-text-secondary)] transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </h3>
                  </summary>
                  <div className="pb-4 pr-8 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {withPlaceholders(item.answer)}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Serve altro? Vai a{' '}
          <Link
            href="/assistenza"
            className="font-semibold text-primary underline underline-offset-2 hover:text-[var(--color-primary-hover)]"
          >
            Assistenza
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
