import { LegalDocument, LegalSection } from '@/components/legal/LegalDocument';
import { LegalConfigNotice } from '@/components/legal/LegalConfigNotice';
import { LegalLink } from '@/components/legal/LegalLink';
import {
  LegalTable,
  LegalTableBody,
  LegalTableCell,
  LegalTableHead,
  LegalTableHeaderCell,
} from '@/components/legal/LegalTable';
import { COOKIE_CONSENT_KEY } from '@/lib/privacy/constants';
import { getCompanyProfile } from '@/lib/privacy/company';

export const metadata = {
  title: 'Cookie Policy — Flygetr',
};

export default function CookiePage() {
  const company = getCompanyProfile();

  return (
    <LegalDocument
      kind="cookie"
      title="Cookie Policy"
      lastUpdated="9 luglio 2026"
      notice={<LegalConfigNotice company={company} />}
    >
      <LegalSection title="1. Titolare">
        <p>
          Il titolare del trattamento tramite cookie è {company.companyName} ({company.tradeName}).
          Contatto:{' '}
          <LegalLink href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection title="2. Cosa sono i cookie">
        <p>
          I cookie sono piccoli file di testo che il sito salva sul tuo dispositivo per garantire il
          funzionamento e migliorare l&apos;esperienza di navigazione.
        </p>
      </LegalSection>

      <LegalSection title="3. Cookie utilizzati da Flygetr">
        <LegalTable>
          <LegalTableHead>
            <LegalTableHeaderCell>Nome</LegalTableHeaderCell>
            <LegalTableHeaderCell>Tipo</LegalTableHeaderCell>
            <LegalTableHeaderCell>Finalità</LegalTableHeaderCell>
            <LegalTableHeaderCell>Durata</LegalTableHeaderCell>
          </LegalTableHead>
          <LegalTableBody>
            <tr>
              <LegalTableCell mono>authjs.*</LegalTableCell>
              <LegalTableCell>Tecnico</LegalTableCell>
              <LegalTableCell>Sessione di autenticazione (login)</LegalTableCell>
              <LegalTableCell>Sessione</LegalTableCell>
            </tr>
            <tr>
              <LegalTableCell mono>{COOKIE_CONSENT_KEY}</LegalTableCell>
              <LegalTableCell>Tecnico</LegalTableCell>
              <LegalTableCell>Memorizza la scelta sul banner cookie</LegalTableCell>
              <LegalTableCell>12 mesi</LegalTableCell>
            </tr>
          </LegalTableBody>
        </LegalTable>
      </LegalSection>

      <LegalSection title="4. Cookie di terze parti">
        <p>
          Se accedi tramite Google o Facebook, tali fornitori possono impostare cookie propri secondo
          le rispettive policy. {company.tradeName} non utilizza cookie di profilazione o analytics
          di terze parti.
        </p>
      </LegalSection>

      <LegalSection title="5. Gestione dei cookie">
        <p>
          I cookie tecnici sono necessari al funzionamento del sito e non richiedono consenso. Puoi
          comunque configurare il browser per bloccarli, ma alcune funzionalità (es. login) potrebbero
          non essere disponibili.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
