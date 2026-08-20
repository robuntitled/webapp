import { LegalDocument, LegalSection } from '@/components/legal/LegalDocument';
import { CompanyIdentity } from '@/components/legal/CompanyIdentity';
import { LegalConfigNotice } from '@/components/legal/LegalConfigNotice';
import { getCompanyProfile } from '@/lib/privacy/company';
import { TERMS_VERSION, MIN_AGE_YEARS } from '@/lib/privacy/constants';

export const metadata = {
  title: 'Termini di Servizio — NomadLink',
};

export default function TermsPage() {
  const company = getCompanyProfile();

  return (
    <LegalDocument
      title="Termini di Servizio"
      lastUpdated={`20 agosto 2026 (v${TERMS_VERSION})`}
      notice={<LegalConfigNotice company={company} />}
    >
      <LegalSection title="1. Premessa e operatore del servizio">
        <p className="mb-4">
          I presenti Termini disciplinano l&apos;uso della piattaforma {company.tradeName},
          gestita da {company.companyName}. Utilizzando il servizio accetti integralmente quanto
          segue.
        </p>
        <CompanyIdentity company={company} />
      </LegalSection>

      <LegalSection title="2. Oggetto">
        <p>
          {company.tradeName} è una piattaforma che consente agli utenti di scoprire, creare e
          partecipare a viaggi di gruppo. L&apos;uso del servizio implica l&apos;accettazione dei
          presenti Termini e dell&apos;
          <a href="/privacy" className="text-blue-600 hover:underline">
            Informativa Privacy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Registrazione e account">
        <ul className="list-disc pl-6 space-y-1">
          <li>Devi avere almeno {MIN_AGE_YEARS} anni per registrarti</li>
          <li>Sei responsabile della riservatezza delle tue credenziali</li>
          <li>Devi fornire informazioni veritiere e aggiornate</li>
          <li>Un account per persona; è vietato impersonare altri utenti</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Natura del servizio: nessun pacchetto turistico">
        <p className="mb-4 font-medium">
          {company.tradeName} è uno strumento di pianificazione e community. Non è un&apos;agenzia di
          viaggi, un tour operator o un organizzatore di pacchetti turistici, e non vende viaggi.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Il &quot;Trip&quot; non è un pacchetto turistico.</strong> È un contenitore di
            itinerario, gruppo e suggerimenti. Non costituisce un pacchetto né un servizio turistico
            collegato venduto da {company.tradeName}, e non è un prodotto acquistabile come un unico
            viaggio.
          </li>
          <li>
            <strong>Ogni servizio è prenotato separatamente con il rispettivo fornitore.</strong>{' '}
            Voli, hotel, attività e altri servizi hanno ciascuno prezzo, condizioni e contratto
            propri, stipulati direttamente tra l&apos;utente e il fornitore terzo. Non esiste un
            prezzo unico del viaggio né un checkout unico. Le cifre in piattaforma sono un{' '}
            <strong>budget orientativo</strong>: i costi reali dipendono dai servizi che ogni
            partecipante prenota separatamente.
          </li>
          <li>
            <strong>{company.tradeName} non è responsabile dell&apos;esecuzione dei servizi.</strong>{' '}
            La fornitura, l&apos;esatta esecuzione, le modifiche, le cancellazioni e i rimborsi di
            ogni servizio sono di esclusiva responsabilità del fornitore che lo eroga.{' '}
            {company.tradeName} risponde unicamente del funzionamento della piattaforma (account,
            gruppo, itinerario, programma punti).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4-bis. NomadPoints">
        <p>
          I NomadPoints sono un programma di fidelizzazione interno. Si ottengono per azioni sulla
          piattaforma (creare un Trip, raggiungere o raddoppiare la soglia del gruppo, inviti,
          profilo, recensioni). <strong>Non hanno valore monetario</strong>, non sono convertibili
          in denaro, non sono un cashback percentuale sulla spesa e si riscattano solo in vantaggi
          interni (boost, template, badge, priorità in Esplora, accesso anticipato). I Founding
          Creator (primi 50 Trip che raggiungono la soglia) ricevono badge permanente, moltiplicatore
          ×3 e boost 14 giorni.
        </p>
      </LegalSection>

      <LegalSection title="5. Contenuti e viaggi creati dagli utenti">
        <p>
          L&apos;utente che crea un viaggio ne è responsabile. {company.tradeName} non organizza i
          viaggi né garantisce la loro esecuzione o la partenza del gruppo. I contenuti pubblicati
          non devono violare diritti di terzi né norme vigenti. Gli itinerari possono essere generati
          o assistiti da strumenti di intelligenza artificiale: vanno sempre verificati dall&apos;utente.
        </p>
      </LegalSection>

      <LegalSection title="6. Dati personali">
        <p>
          Il trattamento dei dati personali è disciplinato dall&apos;
          <a href="/privacy" className="text-blue-600 hover:underline">
            Informativa Privacy
          </a>
          . Registrandoti dichiari di averla letta e compresa.
        </p>
      </LegalSection>

      <LegalSection title="7. Sospensione e cancellazione">
        <p>
          Possiamo sospendere o chiudere account che violano questi Termini. Puoi cancellare il tuo
          account in qualsiasi momento dalle Impostazioni; la cancellazione comporta la rimozione dei
          tuoi dati personali salvo obblighi di legge.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitazione di responsabilità">
        <p>
          Il servizio è fornito &quot;così com&apos;è&quot;. Coerentemente con l&apos;art. 4,{' '}
          {company.tradeName} non è responsabile per l&apos;esecuzione dei servizi turistici prenotati
          con i fornitori, per i viaggi creati tra utenti, per interruzioni del servizio o per
          contenuti di terzi. Ogni reclamo relativo a un servizio va rivolto al fornitore che lo ha
          erogato.
        </p>
      </LegalSection>

      <LegalSection title="9. Legge applicabile e foro competente">
        <p>
          I presenti Termini sono regolati dalla legge italiana. Per le controversie con consumatori
          residenti in Italia si applica il foro del consumatore; negli altri casi, foro di{' '}
          {company.city.startsWith('[') ? 'Italia' : company.city}.
        </p>
      </LegalSection>

      <LegalSection title="10. Contatti">
        <p>
          Per assistenza:{' '}
          <a href={`mailto:${company.supportEmail}`} className="text-blue-600 hover:underline">
            {company.supportEmail}
          </a>
          . Per questioni privacy:{' '}
          <a href={`mailto:${company.privacyEmail}`} className="text-blue-600 hover:underline">
            {company.privacyEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  );
}