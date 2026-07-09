import 'server-only';

import { LEGAL_PLACEHOLDERS } from '@/lib/privacy/company.defaults';

/**
 * Profilo legale centralizzato.
 * Compila le variabili LEGAL_* in .env.local prima del lancio in produzione.
 * Vedi .env.example per l'elenco completo.
 */

export { LEGAL_PLACEHOLDERS };

export type CompanyProfile = {
  /** Ragione sociale (titolare del trattamento) */
  companyName: string;
  /** Nome commerciale mostrato nell'app */
  tradeName: string;
  vatId: string;
  fiscalCode: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  privacyEmail: string;
  supportEmail: string;
  dpoEmail: string;
  pec: string;
  phone: string;
  rea: string;
  shareCapital: string;
  websiteUrl: string;
  /** true se tutti i campi obbligatori sono compilati in .env.local */
  isComplete: boolean;
  /** true se almeno un campo obbligatorio usa ancora un placeholder */
  usesPlaceholders: boolean;
};

const REQUIRED_ENV_KEYS = [
  'LEGAL_COMPANY_NAME',
  'LEGAL_VAT_ID',
  'LEGAL_ADDRESS_LINE',
  'LEGAL_CITY',
  'LEGAL_POSTAL_CODE',
  'LEGAL_EMAIL_PRIVACY',
] as const;

function env(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

function valueOrPlaceholder(envKey: string, placeholder: string): string {
  return env(envKey) ?? placeholder;
}

export function isCompanyProfileComplete(): boolean {
  return REQUIRED_ENV_KEYS.every((key) => !!env(key));
}

export function getCompanyProfile(): CompanyProfile {
  const companyName = valueOrPlaceholder('LEGAL_COMPANY_NAME', LEGAL_PLACEHOLDERS.companyName);
  const tradeName = env('LEGAL_TRADE_NAME') ?? env('NEXT_PUBLIC_APP_NAME') ?? LEGAL_PLACEHOLDERS.tradeName;
  const vatId = valueOrPlaceholder('LEGAL_VAT_ID', LEGAL_PLACEHOLDERS.vatId);
  const fiscalCode = valueOrPlaceholder('LEGAL_FISCAL_CODE', LEGAL_PLACEHOLDERS.fiscalCode);
  const addressLine = valueOrPlaceholder('LEGAL_ADDRESS_LINE', LEGAL_PLACEHOLDERS.addressLine);
  const city = valueOrPlaceholder('LEGAL_CITY', LEGAL_PLACEHOLDERS.city);
  const province = valueOrPlaceholder('LEGAL_PROVINCE', LEGAL_PLACEHOLDERS.province);
  const postalCode = valueOrPlaceholder('LEGAL_POSTAL_CODE', LEGAL_PLACEHOLDERS.postalCode);
  const country = env('LEGAL_COUNTRY') ?? LEGAL_PLACEHOLDERS.country;
  const privacyEmail = valueOrPlaceholder('LEGAL_EMAIL_PRIVACY', LEGAL_PLACEHOLDERS.privacyEmail);
  const supportEmail = valueOrPlaceholder('LEGAL_EMAIL_SUPPORT', LEGAL_PLACEHOLDERS.supportEmail);
  const dpoEmail = valueOrPlaceholder('LEGAL_EMAIL_DPO', LEGAL_PLACEHOLDERS.dpoEmail);
  const pec = valueOrPlaceholder('LEGAL_PEC', LEGAL_PLACEHOLDERS.pec);
  const phone = valueOrPlaceholder('LEGAL_PHONE', LEGAL_PLACEHOLDERS.phone);
  const rea = valueOrPlaceholder('LEGAL_REA', LEGAL_PLACEHOLDERS.rea);
  const shareCapital = valueOrPlaceholder('LEGAL_SHARE_CAPITAL', LEGAL_PLACEHOLDERS.shareCapital);
  const websiteUrl = env('LEGAL_WEBSITE_URL') ?? env('NEXT_PUBLIC_APP_URL') ?? LEGAL_PLACEHOLDERS.websiteUrl;

  const isComplete = isCompanyProfileComplete();
  const usesPlaceholders =
    !isComplete ||
    [companyName, vatId, addressLine, city, postalCode].some((v) => v.startsWith('['));

  return {
    companyName,
    tradeName,
    vatId,
    fiscalCode,
    addressLine,
    city,
    province,
    postalCode,
    country,
    privacyEmail,
    supportEmail,
    dpoEmail,
    pec,
    phone,
    rea,
    shareCapital,
    websiteUrl,
    isComplete,
    usesPlaceholders,
  };
}

/** Indirizzo formattato su una riga */
export function formatCompanyAddress(profile: CompanyProfile): string {
  const parts = [
    profile.addressLine,
    `${profile.postalCode} ${profile.city}`,
    profile.province !== LEGAL_PLACEHOLDERS.province ? `(${profile.province})` : null,
    profile.country,
  ].filter(Boolean);
  return parts.join(', ');
}