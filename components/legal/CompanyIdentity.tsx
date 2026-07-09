import type { CompanyProfile } from '@/lib/privacy/company';
import { formatCompanyAddress } from '@/lib/privacy/company';

export function CompanyIdentity({ company }: { company: CompanyProfile }) {
  return (
    <dl className="space-y-2 text-sm">
      <div>
        <dt className="font-medium text-slate-900">Ragione sociale</dt>
        <dd>{company.companyName}</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-900">Nome commerciale</dt>
        <dd>{company.tradeName}</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-900">Sede legale</dt>
        <dd>{formatCompanyAddress(company)}</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-900">P.IVA</dt>
        <dd>{company.vatId}</dd>
      </div>
      {company.fiscalCode && !company.fiscalCode.startsWith('[') && (
        <div>
          <dt className="font-medium text-slate-900">Codice fiscale</dt>
          <dd>{company.fiscalCode}</dd>
        </div>
      )}
      {company.rea && !company.rea.startsWith('[') && (
        <div>
          <dt className="font-medium text-slate-900">Iscrizione REA / CCIAA</dt>
          <dd>{company.rea}</dd>
        </div>
      )}
      {company.shareCapital && !company.shareCapital.startsWith('[') && (
        <div>
          <dt className="font-medium text-slate-900">Capitale sociale</dt>
          <dd>{company.shareCapital}</dd>
        </div>
      )}
      <div>
        <dt className="font-medium text-slate-900">Email privacy</dt>
        <dd>
          <a href={`mailto:${company.privacyEmail}`} className="text-blue-600 hover:underline">
            {company.privacyEmail}
          </a>
        </dd>
      </div>
      {company.pec && !company.pec.startsWith('[') && (
        <div>
          <dt className="font-medium text-slate-900">PEC</dt>
          <dd>
            <a href={`mailto:${company.pec}`} className="text-blue-600 hover:underline">
              {company.pec}
            </a>
          </dd>
        </div>
      )}
      {company.dpoEmail && !company.dpoEmail.startsWith('[') && (
        <div>
          <dt className="font-medium text-slate-900">Referente privacy / DPO</dt>
          <dd>
            <a href={`mailto:${company.dpoEmail}`} className="text-blue-600 hover:underline">
              {company.dpoEmail}
            </a>
          </dd>
        </div>
      )}
      {company.phone && !company.phone.startsWith('[') && (
        <div>
          <dt className="font-medium text-slate-900">Telefono</dt>
          <dd>{company.phone}</dd>
        </div>
      )}
      <div>
        <dt className="font-medium text-slate-900">Sito web</dt>
        <dd>
          <a href={company.websiteUrl} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            {company.websiteUrl}
          </a>
        </dd>
      </div>
    </dl>
  );
}