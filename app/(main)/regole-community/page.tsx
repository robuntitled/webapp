import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { BozzaBanner } from '@/components/content/BozzaBanner';
import { ContentPlaceholder } from '@/components/content/ContentPlaceholder';
import { pageOpenGraph } from '@/lib/brand/seo';

const TITLE = 'Regole della community';
const DESCRIPTION =
  'Regole per i viaggi di gruppo e la chat su Noivia (bozza da revisione professionale).';

/** Draft-only: source doc says non pubblicare → noindex until Legale signs off. */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/regole-community' },
  robots: { index: false, follow: false },
  openGraph: pageOpenGraph('/regole-community', TITLE, DESCRIPTION),
};

function DaAttivare({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-amber-300/80 bg-amber-50/50 px-3 py-2.5 text-sm text-amber-950/90">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
        Da attivare
      </p>
      <div className="mt-1 space-y-1.5 leading-relaxed">{children}</div>
    </div>
  );
}

export default function RegoleCommunityPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="nl-page w-full space-y-10 py-12">
        <BozzaBanner draftOnly>
          Versione semplificata da far rivedere a un professionista. Non sostituisce i Termini.
          Nessun indirizzo email inventato: resta il segnaposto.
        </BozzaBanner>

        <header className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
            BOZZA
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-4xl">
            Regole della community
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Queste regole valgono per i viaggi di gruppo e per la chat del gruppo su Noivia. Si
            aggiungono ai{' '}
            <Link
              href="/termini"
              className="font-semibold text-primary underline underline-offset-2 hover:text-[var(--color-primary-hover)]"
            >
              Termini di servizio
            </Link>
            . Se usi i gruppi e la chat, le accetti.
          </p>
        </header>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            1. Chi può entrare
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <li>
              Devi avere <strong className="text-[var(--color-text)]">almeno 18 anni</strong>.
            </li>
            <li>
              Prima di unirti a un gruppo spunti la casella «Dichiaro di avere almeno 18 anni». La
              casella non è già spuntata.
            </li>
            <li>
              È una <strong className="text-[var(--color-text)]">tua dichiarazione</strong>. Non
              controlliamo i documenti: non verifichiamo né l&apos;età né l&apos;identità.
            </li>
          </ul>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            2. Come comportarti
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Sii rispettoso. La chat serve per organizzare il viaggio. Non serve per vendere,
            offendere o truffare.
          </p>
          <p className="text-sm font-semibold text-[var(--color-text)]">Non puoi:</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <li>pubblicare contenuti illegali;</li>
            <li>scrivere molestie, minacce, insulti o messaggi d&apos;odio;</li>
            <li>mandare spam o pubblicità;</li>
            <li>
              vendere servizi, o presentarti come organizzatore o tour operator se non lo sei;
            </li>
            <li>
              chiedere o raccogliere soldi da altre persone in chat (niente «pagami la quota»);
            </li>
            <li>
              condividere i dati personali di altre persone (telefono, email, documenti, indirizzo);
            </li>
            <li>fingerti un&apos;altra persona.</li>
          </ul>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Un filtro automatico può bloccare alcuni messaggi, per esempio quelli con insulti, link,
            email, numeri di telefono o inviti a passare su WhatsApp o Telegram. Se un tuo messaggio
            viene bloccato, te ne accorgi subito.
          </p>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            3. La tua sicurezza
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <strong className="text-[var(--color-text)]">
              Non verifichiamo l&apos;identità delle persone.
            </strong>{' '}
            Chi incontri in un gruppo potrebbe non essere chi dice di essere.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <li>
              Per i primi incontri scegli un luogo pubblico e avvisa una persona di fiducia.
            </li>
            <li>Non pagare sconosciuti. Non mandare soldi o documenti in chat.</li>
            <li>
              Il viaggio si paga solo nei canali ufficiali indicati (il venditore o il tour
              operator), mai in chat.
            </li>
          </ul>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            4. Segnala e Blocca
          </h2>
          <p className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs font-medium text-amber-950">
            Non ancora attivo in produzione finché la migrazione Segnala/Blocca non è verificata.
            Testo tenuto in bozza.
          </p>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Nella chat del gruppo apri il menu su un messaggio di un&apos;altra persona e scegli:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <li>
              <strong className="text-[var(--color-text)]">Segnala.</strong> Ti chiediamo il motivo,
              in almeno 3 caratteri. Poi vedi la conferma «Segnalazione ricevuta. Grazie: la
              esamineremo al più presto.»
            </li>
            <li>
              <strong className="text-[var(--color-text)]">Blocca.</strong> Non vedi più i messaggi
              di quella persona nella chat.
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            In cima alla chat trovi anche <strong className="text-[var(--color-text)]">Segnala gruppo</strong>.
          </p>
          <DaAttivare>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                Segnalare un profilo: un modulo con un elenco di motivi, uno spazio per spiegare, la
                conferma che segnali in buona fede e un numero di segnalazione.
              </li>
              <li>
                Sbloccare una persona dalle impostazioni. Oggi puoi bloccare, ma non puoi ancora
                sbloccare da solo.
              </li>
            </ul>
          </DaAttivare>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            5. Cosa succede dopo una segnalazione
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Oggi salviamo la segnalazione e ti confermiamo che è arrivata.
          </p>
          <DaAttivare>
            <ul className="list-disc space-y-1 pl-4">
              <li>Esaminiamo la segnalazione e ti diciamo com&apos;è andata.</li>
              <li>
                Se togliamo un contenuto o limitiamo un account, ti spieghiamo cosa è successo,
                perché (queste regole, i Termini o la legge) e se la decisione è stata automatica.
              </li>
              <li>
                Avrai un pulsante semplice: <strong>Contesta</strong>.
              </li>
              <li>
                Sospensioni ed espulsioni le decide una persona, non solo il filtro automatico.
              </li>
            </ul>
          </DaAttivare>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Non indichiamo tempi di risposta precisi finché non ci sarà qualcuno che modera in modo
            continuo.
          </p>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            6. Cosa succede se non rispetti le regole
          </h2>
          <DaAttivare>
            <p>Interveniamo per gradi:</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>un avviso, con il motivo;</li>
              <li>la rimozione del messaggio;</li>
              <li>la sospensione dalla chat del gruppo (per esempio per 7 giorni);</li>
              <li>l&apos;uscita dal gruppo;</li>
              <li>la sospensione dell&apos;account.</li>
            </ol>
            <p>
              Ogni provvedimento ti arriva con il motivo e con il pulsante <strong>Contesta</strong>.
            </p>
          </DaAttivare>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            7. Se c&apos;è un pericolo
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Se tu o un&apos;altra persona siete in pericolo immediato, chiama il{' '}
            <strong className="text-[var(--color-text)]">112</strong>.
          </p>
          <DaAttivare>
            <p>
              Se da una segnalazione emerge un rischio per la vita o la sicurezza di una persona,
              Noivia avvisa subito le autorità (art. 18 del Digital Services Act).
            </p>
          </DaAttivare>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            8. Come contattarci
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Per domande su queste regole, per una segnalazione o per contestare una decisione
            scrivi a <ContentPlaceholder>{'{email_contatto}'}</ContentPlaceholder>. Lo stesso
            indirizzo serve anche alle autorità per contattarci. Lingue: italiano e inglese.
          </p>
          <DaAttivare>
            <p>L&apos;indirizzo e la pagina dei contatti, quando saranno pronti.</p>
          </DaAttivare>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">
            9. I tuoi messaggi e i tuoi dati
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            <li>
              I messaggi della chat li vedono solo gli iscritti a quel gruppo. Chi è fuori dal
              gruppo non li vede.
            </li>
            <li>
              Se il gruppo non parte, la chat resta in sola lettura per{' '}
              <strong className="text-[var(--color-text)]">14 giorni</strong> e poi viene cancellata
              entro <strong className="text-[var(--color-text)]">30 giorni</strong>.
              <span className="ml-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                [DA ATTIVARE]
              </span>
            </li>
            <li>
              Se il gruppo parte, i messaggi restano per{' '}
              <ContentPlaceholder>{'{X}'}</ContentPlaceholder> mesi dopo il rientro e poi vengono
              cancellati.
              <span className="ml-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                [DA ATTIVARE]
              </span>
            </li>
            <li>
              Se cancelli l&apos;account, i tuoi messaggi diventano «Messaggio eliminato». Restano
              solo quelli legati a una segnalazione ancora aperta.
              <span className="ml-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                [DA ATTIVARE]
              </span>
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Tutti i dettagli sono nell&apos;
            <Link
              href="/privacy"
              className="font-semibold text-primary underline underline-offset-2 hover:text-[var(--color-primary-hover)]"
            >
              Informativa privacy
            </Link>
            .
          </p>
        </section>

        <section className="max-w-2xl space-y-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-text)]">10. Termini</h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            Queste regole fanno parte dei{' '}
            <Link
              href="/termini"
              className="font-semibold text-primary underline underline-offset-2 hover:text-[var(--color-primary-hover)]"
            >
              Termini di servizio
            </Link>
            . Se le regole e i Termini dicono cose diverse, valgono i Termini, finché un
            professionista non dice diversamente.
          </p>
        </section>
      </div>
    </div>
  );
}
