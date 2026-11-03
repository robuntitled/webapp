import type { CompanyProfile } from '@/lib/privacy/company';
import { isPlaceholder } from '@/lib/privacy/is-placeholder';

/** Strings that would appear in the site footer for a given company profile. */
export function collectFooterVisibleCopy(company: CompanyProfile): string[] {
  const lines = [`© ${company.tradeName}`];
  if (!isPlaceholder(company.privacyEmail)) {
    lines.push(`Privacy: ${company.privacyEmail}`);
  }
  return lines;
}

/** Strings visible in CompanyIdentity for legal pages. */
export function collectCompanyIdentityCopy(company: CompanyProfile): string[] {
  const rows: string[] = [];
  if (!isPlaceholder(company.companyName)) rows.push(company.companyName);
  if (!isPlaceholder(company.tradeName)) rows.push(company.tradeName);
  if (!isPlaceholder(company.vatId)) rows.push(company.vatId);
  if (!isPlaceholder(company.fiscalCode)) rows.push(company.fiscalCode);
  if (!isPlaceholder(company.rea)) rows.push(company.rea);
  if (!isPlaceholder(company.shareCapital)) rows.push(company.shareCapital);
  if (!isPlaceholder(company.privacyEmail)) rows.push(company.privacyEmail);
  if (!isPlaceholder(company.pec)) rows.push(company.pec);
  if (!isPlaceholder(company.dpoEmail)) rows.push(company.dpoEmail);
  if (!isPlaceholder(company.phone)) rows.push(company.phone);
  if (!isPlaceholder(company.websiteUrl)) rows.push(company.websiteUrl);
  return rows;
}
