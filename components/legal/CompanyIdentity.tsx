import type { CompanyProfile } from '@/lib/privacy/company';
import { formatCompanyAddress } from '@/lib/privacy/company';
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
  return (
    <div className="mt-1.5 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-50/50">
      <div className="border-b border-slate-100/90 bg-white/70 px-3.5 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Titolare del trattamento
        </p>
      </div>
      <dl className="px-3.5 sm:px-4">
        <IdentityRow label="Ragione sociale" icon={Building2}>
          {company.companyName}
        </IdentityRow>
        <IdentityRow label="Nome commerciale">{company.tradeName}</IdentityRow>
        <IdentityRow label="Sede legale">{formatCompanyAddress(company)}</IdentityRow>
        <IdentityRow label="P.IVA">{company.vatId}</IdentityRow>
        {company.fiscalCode && !company.fiscalCode.startsWith('[') ? (
          <IdentityRow label="Codice fiscale">{company.fiscalCode}</IdentityRow>
        ) : null}
        {company.rea && !company.rea.startsWith('[') ? (
          <IdentityRow label="REA / CCIAA">{company.rea}</IdentityRow>
        ) : null}
        {company.shareCapital && !company.shareCapital.startsWith('[') ? (
          <IdentityRow label="Capitale sociale">{company.shareCapital}</IdentityRow>
        ) : null}
        <IdentityRow label="Email privacy" icon={Mail}>
          <LegalLink href={`mailto:${company.privacyEmail}`}>{company.privacyEmail}</LegalLink>
        </IdentityRow>
        {company.pec && !company.pec.startsWith('[') ? (
          <IdentityRow label="PEC" icon={Mail}>
            <LegalLink href={`mailto:${company.pec}`}>{company.pec}</LegalLink>
          </IdentityRow>
        ) : null}
        {company.dpoEmail && !company.dpoEmail.startsWith('[') ? (
          <IdentityRow label="Referente privacy">{company.dpoEmail}</IdentityRow>
        ) : null}
        {company.phone && !company.phone.startsWith('[') ? (
          <IdentityRow label="Telefono" icon={Phone}>
            {company.phone}
          </IdentityRow>
        ) : null}
        <IdentityRow label="Sito web" icon={Globe}>
          <LegalLink href={company.websiteUrl} external>
            {company.websiteUrl}
          </LegalLink>
        </IdentityRow>
      </dl>
    </div>
  );
}
