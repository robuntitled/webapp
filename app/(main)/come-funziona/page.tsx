import type { Metadata } from 'next';
import Link from 'next/link';
import { BozzaBanner } from '@/components/content/BozzaBanner';
import { ContentPlaceholder, withPlaceholders } from '@/components/content/ContentPlaceholder';
import { Button } from '@/components/ui/button';
import { pageOpenGraph } from '@/lib/brand/seo';
import { getSiteUrl } from '@/lib/brand';

const TITLE = 'Come funziona Noivia: organizza o unisciti a un gruppo';
const DESCRIPTION =
  'Organizzi il viaggio e prenoti voli e hotel servizio per servizio, oppure ti unisci a una partenza di gruppo con un tour operator autorizzato.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/come-funziona' },
  robots: { index: false, follow: false },
  openGraph: pageOpenGraph('/come-funziona', TITLE, DESCRIPTION),
};

function BreadcrumbJsonLd() {
  const siteUrl = getSiteUrl();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Come funziona',
        item: `${siteUrl}/come-funziona`,
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function ComeFunzionaPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <BreadcrumbJsonLd />
      <div className="nl-page w-full space-y-10 py-12">
        <BozzaBanner>
          Testo in bozza: da rilettura legale. I dettagli del venditore saranno aggiornati quando
          disponibili.
        </BozzaBanner>

        <header className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            Guida
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-4xl">
            Come funziona Noivia
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)]">
            Con Noivia hai due strade: organizzi il tuo viaggio, da solo o con amici, oppure ti
            unisci a una partenza di gruppo.
          </p>
        </header>

        <section className="max-w-2xl space-y-4">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            Organizza il tuo viaggio
          </h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <li>
              <strong className="text-[var(--color-text)]">Scegli dove andare.</strong> Una o più
              mete e la durata. Parti da una bozza di itinerario della redazione di Noivia e
              adattalo alle tue date.
            </li>
            <li>
              <strong className="text-[var(--color-text)]">Indica da dove parti e quando.</strong>{' '}
              Aeroporto di partenza, date e con chi viaggi.
            </li>
            <li>
              <strong className="text-[var(--color-text)]">Scegli i voli.</strong> Ti mostriamo i
              voli per ogni tratta. Controlla il riepilogo prima di creare il viaggio.
            </li>
            <li>
              <strong className="text-[var(--color-text)]">Prenota quando vuoi.</strong> Ogni tratta
              e ogni hotel si pagano a parte, uno alla volta. I prezzi possono cambiare finché non
              paghi.
            </li>
          </ol>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Puoi cercare e confrontare voli e hotel anche senza account. Ti chiediamo di accedere
            solo per salvare il viaggio o prenotare.
          </p>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">Chi vende cosa</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <li>
              <strong className="text-[var(--color-text)]">Voli e hotel</strong> li vende{' '}
              <ContentPlaceholder>{'{venditore}'}</ContentPlaceholder>, che gestisce anche il
              pagamento. Noivia ti aiuta a prenotare e non è il venditore.
            </li>
            <li>
              Per ogni volo vedi la compagnia aerea che lo opera: &quot;Volo operato da{' '}
              <ContentPlaceholder>{'{compagnia}'}</ContentPlaceholder>&quot;.
            </li>
            <li>
              <strong className="text-[var(--color-text)]">Sugli hotel</strong> il prezzo include il
              costo del servizio Noivia (
              <ContentPlaceholder>{'{costo servizio}'}</ContentPlaceholder>).
            </li>
            <li>
              Prima di pagare vedi il venditore, il prezzo finale con il dettaglio e le condizioni
              della tariffa. Per gli hotel vedi anche le tasse da pagare in struttura, se ci sono.
            </li>
          </ul>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            Ognuno ha il suo biglietto
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Ogni viaggiatore prenota e paga i propri servizi. I biglietti sono separati, anche se
            viaggiate insieme.
          </p>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            Viaggia con i tuoi amici
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Crea il viaggio e invita chi vuoi con un link, per esempio su WhatsApp. Per unirsi a un
            viaggio bisogna dichiarare di avere almeno 18 anni.
          </p>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            Partenze di gruppo
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Partenze di gruppo in arrivo, organizzate da tour operator autorizzati. Quando aprono,
            l&apos;iscrizione è gratuita.
          </p>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            La chat del gruppo
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Prima di scrivere in chat, leggi le{' '}
            <Link
              href="/regole-community"
              className="font-semibold text-primary underline underline-offset-2 hover:text-[var(--color-primary-hover)]"
            >
              Regole della community
            </Link>
            .
          </p>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">Serve aiuto?</h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {withPlaceholders(
              'Per cambi, cancellazioni o problemi con un volo o un hotel, il riferimento è {venditore} (o la compagnia aerea), secondo le condizioni della tariffa che hai visto prima di pagare. Per tutto il resto scrivici: {canale assistenza}, {orari}.'
            )}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild className="rounded-[10px]">
              <Link href="/organizza">Organizza il tuo viaggio</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-[10px]">
              <Link href="/gruppi">Vedi le partenze di gruppo</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-[10px]">
              <Link href="/domande-frequenti">Domande frequenti</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
