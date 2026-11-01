import type { CompanyProfile } from '@/lib/privacy/company';
import { formatCompanyAddress } from '@/lib/privacy/company';
import { isPlaceholder } from '@/lib/privacy/is-placeholder';
import { Building2, Globe, Mail, Phone } from 'lucide-react';
import { LegalLink } from '@/components/legal/LegalLink';

function IdentityRow({
  label,
  children,
  icon: Icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: typeof Building2;
}) {
  return (
    <div className="grid gap-0.5 border-b border-slate-100/90 py-2.5 last:border-0 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {Icon ? <Icon className="h-3 w-3 shrink-0" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="text-[0.8125rem] font-medium leading-snug text-slate-800">{children}</dd>
    </div>
  );
}

export function CompanyIdentity({ company }: { company: CompanyProfile }) {
  const address = formatCompanyAddress(company);
  const showAddress = !isPlaceholder(company.addressLine) && !isPlaceholder(company.city);

  return (
    <div className="mt-1.5 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-50/50">
      <div className="border-b border-slate-100/90 bg-white/70 px-3.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Titolare del trattamento
        </p>
      </div>
      <dl className="px-3.5 sm:px-4">
        {!isPlaceholder(company.companyName) ? (
          <IdentityRow label="Ragione sociale" icon={Building2}>
            {company.companyName}
          </IdentityRow>
        ) : null}
        {!isPlaceholder(company.tradeName) ? (
          <IdentityRow label="Nome commerciale">{company.tradeName}</IdentityRow>
        ) : null}
        {showAddress ? (
          <IdentityRow label="Sede legale">{address}</IdentityRow>
        ) : null}
        {!isPlaceholder(company.vatId) ? (
          <IdentityRow label="P.IVA">{company.vatId}</IdentityRow>
        ) : null}
        {!isPlaceholder(company.fiscalCode) ? (
          <IdentityRow label="Codice fiscale">{company.fiscalCode}</IdentityRow>
        ) : null}
        {!isPlaceholder(company.rea) ? (
          <IdentityRow label="REA / CCIAA">{company.rea}</IdentityRow>
        ) : null}
        {!isPlaceholder(company.shareCapital) ? (
          <IdentityRow label="Capitale sociale">{company.shareCapital}</IdentityRow>
        ) : null}
        {!isPlaceholder(company.privacyEmail) ? (
          <IdentityRow label="Email privacy" icon={Mail}>
            <LegalLink href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</LegalLink>
          </IdentityRow>
        ) : null}
        {!isPlaceholder(company.pec) ? (
          <IdentityRow label="PEC" icon={Mail}>
            <LegalLink href={`mailto:${company.pec}`}>{company.pec}</LegalLink>
          </IdentityRow>
        ) : null}
        {!isPlaceholder(company.dpoEmail) ? (
          <IdentityRow label="Referente privacy">{company.dpoEmail}</IdentityRow>
        ) : null}
        {!isPlaceholder(company.phone) ? (
          <IdentityRow label="Telefono" icon={Phone}>
            {company.phone}
          </IdentityRow>
        ) : null}
        {!isPlaceholder(company.websiteUrl) ? (
          <IdentityRow label="Sito web" icon={Globe}>
            <LegalLink href={company.websiteUrl} external>
              {company.websiteUrl}
            </LegalLink>
          </IdentityRow>
        ) : null}
      </dl>
    </div>
  );
}
