import { LegalDocument, LegalSection } from '@/components/legal/LegalDocument';
import { CompanyIdentity } from '@/components/legal/CompanyIdentity';
import { LegalConfigNotice } from '@/components/legal/LegalConfigNotice';
import { getCompanyProfile } from '@/lib/privacy/company';
import { PRIVACY_POLICY_VERSION, MIN_AGE_YEARS } from '@/lib/privacy/constants';

export const metadata = {
  title: 'Informativa Privacy — Bradigo',
};

export default function PrivacyPage() {
  const company = getCompanyProfile();

  return (
    <LegalDocument
      title="Informativa Privacy"
      lastUpdated={`9 luglio 2026 (v${PRIVACY_POLICY_VERSION})`}
      notice={<LegalConfigNotice company={company} />}
    >
      <LegalSection title="1. Titolare del trattamento">
        <p className="mb-4">
          Il titolare del trattamento dei dati personali è il soggetto indicato di seguito. Per
          esercitare i tuoi diritti o per qualsiasi richiesta relativa alla privacy puoi contattarci
          ai recapiti indicati.
        </p>
        <CompanyIdentity company={company} />
      </LegalSection>

      <LegalSection title="2. Tipologie di dati raccolti">
        <ul className="list-disc pl-6 space-y-1">
          <li>Dati identificativi: nome, cognome, email, immagine profilo</li>
          <li>Dati di autenticazione: password (conservata in forma crittografata)</li>
          <li>Dati di profilo facoltativi: data di nascita, telefono, indirizzo</li>
          <li>Dati di utilizzo: viaggi creati, preferiti, partecipazioni</li>
          <li>Dati tecnici: cookie di sessione necessari al login</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalità e base giuridica">
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Erogazione del servizio</strong> (art. 6.1.b GDPR): registrazione, login,
            creazione e partecipazione a viaggi
          </li>
          <li>
            <strong>Consenso</strong> (art. 6.1.a GDPR): comunicazioni promozionali via email
          </li>
          <li>
            <strong>Legittimo interesse</strong> (art. 6.1.f GDPR): sicurezza della piattaforma,
            prevenzione abusi
          </li>
          <li>
            <strong>Obblighi di legge</strong> (art. 6.1.c GDPR): conservazione dati per
            adempimenti normativi
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Destinatari e responsabili del trattamento">
        <p>I dati possono essere trattati da fornitori che agiscono come responsabili:</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>Supabase (hosting database e file)</li>
          <li>Google (autenticazione OAuth, se utilizzata)</li>
          <li>Meta/Facebook (autenticazione OAuth, se utilizzata)</li>
          <li>Pexels (ricerca immagini per i viaggi)</li>
        </ul>
        <p className="mt-2">
          I trasferimenti verso Paesi extra-UE avvengono nel rispetto delle Clausole Contrattuali
          Standard (SCC) previste dai fornitori.
        </p>
      </LegalSection>

      <LegalSection title="5. Conservazione">
        <p>
          I dati sono conservati per tutta la durata dell&apos;account e fino a 30 giorni dopo la
          cancellazione, salvo obblighi di legge più lunghi. I consensi sono registrati con data e
          versione dell&apos;informativa accettata.
        </p>
      </LegalSection>

      <LegalSection title="6. Diritti dell'interessato">
        <p>
          Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione ai
          sensi degli artt. 15–22 GDPR. Puoi:
        </p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>Esportare i tuoi dati da Impostazioni → I tuoi diritti GDPR</li>
          <li>Eliminare il tuo account da Impostazioni → Elimina account</li>
          <li>Revocare il consenso marketing in qualsiasi momento</li>
          <li>
            Scrivere a{' '}
            <a href={`mailto:${company.privacyEmail}`} className="text-blue-600 hover:underline">
              {company.privacyEmail}
            </a>{' '}
            per altre richieste
          </li>
          <li>
            Proporre reclamo al Garante per la Protezione dei Dati Personali (garanteprivacy.it)
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Minori">
        <p>
          Il servizio è riservato a utenti di almeno {MIN_AGE_YEARS} anni. Non raccogliamo
          consapevolmente dati di minori senza il consenso del genitore o tutore.
        </p>
      </LegalSection>

      <LegalSection title="8. Sicurezza">
        <p>
          Adottiamo misure tecniche e organizzative adeguate: password crittografate, accesso ai dati
          sensibili solo lato server, policy di sicurezza sul database, rate limiting sulla
          registrazione.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}