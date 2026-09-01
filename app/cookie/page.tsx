import { LegalDocument, LegalSection } from '@/components/legal/LegalDocument';
import { LegalConfigNotice } from '@/components/legal/LegalConfigNotice';
import { getCompanyProfile } from '@/lib/privacy/company';

export const metadata = {
  title: 'Cookie Policy — Flygetr',
};

export default function CookiePage() {
  const company = getCompanyProfile();

  return (
    <LegalDocument
      title="Cookie Policy"
      lastUpdated="9 luglio 2026"
      notice={<LegalConfigNotice company={company} />}
    >
      <LegalSection title="1. Titolare">
        <p>
          Il titolare del trattamento tramite cookie è {company.companyName} ({company.tradeName}).
          Contatto:{' '}
          <a href={`mailto:${company.privacyEmail}`} className="text-blue-600 hover:underline">
            {company.privacyEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Cosa sono i cookie">
        <p>
          I cookie sono piccoli file di testo che il sito salva sul tuo dispositivo per garantire il
          funzionamento e migliorare l&apos;esperienza di navigazione.
        </p>
      </LegalSection>

      <LegalSection title="3. Cookie utilizzati da Flygetr">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse mt-2">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Finalità</th>
                <th className="py-2">Durata</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">authjs.*</td>
                <td className="py-2 pr-4">Tecnico</td>
                <td className="py-2 pr-4">Sessione di autenticazione (login)</td>
                <td className="py-2">Sessione</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 font-mono text-xs">nomadlink-cookie-consent</td>
                <td className="py-2 pr-4">Tecnico</td>
                <td className="py-2 pr-4">Memorizza la scelta sul banner cookie</td>
                <td className="py-2">12 mesi</td>
              </tr>
            </tbody>
          </table>
        </div>
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