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
      lastUpdated={`9 luglio 2026 (v${TERMS_VERSION})`}
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

      <LegalSection title="4. Contenuti e viaggi">
        <p>
          L&apos;utente che crea un viaggio ne è responsabile. {company.tradeName} non organizza
          direttamente i viaggi né garantisce la loro esecuzione. I contenuti pubblicati non devono
          violare diritti di terzi né norme vigenti.
        </p>
      </LegalSection>

      <LegalSection title="5. Dati personali">
        <p>
          Il trattamento dei dati personali è disciplinato dall&apos;
          <a href="/privacy" className="text-blue-600 hover:underline">
            Informativa Privacy
          </a>
          . Registrandoti dichiari di averla letta e compresa.
        </p>
      </LegalSection>

      <LegalSection title="6. Sospensione e cancellazione">
        <p>
          Possiamo sospendere o chiudere account che violano questi Termini. Puoi cancellare il tuo
          account in qualsiasi momento dalle Impostazioni; la cancellazione comporta la rimozione dei
          tuoi dati personali salvo obblighi di legge.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitazione di responsabilità">
        <p>
          Il servizio è fornito &quot;così com&apos;è&quot;. {company.tradeName} non è responsabile
          per danni derivanti da viaggi organizzati tra utenti, interruzioni del servizio o contenuti
          di terzi.
        </p>
      </LegalSection>

      <LegalSection title="8. Legge applicabile e foro competente">
        <p>
          I presenti Termini sono regolati dalla legge italiana. Per le controversie con consumatori
          residenti in Italia si applica il foro del consumatore; negli altri casi, foro di{' '}
          {company.city.startsWith('[') ? 'Italia' : company.city}.
        </p>
      </LegalSection>

      <LegalSection title="9. Contatti">
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