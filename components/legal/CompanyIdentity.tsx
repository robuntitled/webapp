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
    <div className="grid gap-1 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

export function CompanyIdentity({ company }: { company: CompanyProfile }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 ring-1 ring-slate-900/[0.02] md:p-6">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        Dati del titolare
      </p>
      <dl className="space-y-4">
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
