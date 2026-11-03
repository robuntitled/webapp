/** Valori placeholder mostrati finché LEGAL_* non è compilato in .env.local */
export const LEGAL_PLACEHOLDERS = {
  companyName: '[Ragione sociale da definire]',
  /** Nome commerciale UI — allineato a BRAND_NAME. */
  tradeName: 'Noivia',
  vatId: '[P.IVA da definire]',
  fiscalCode: '[Codice fiscale da definire]',
  addressLine: '[Indirizzo sede legale da definire]',
  city: '[Città da definire]',
  province: '[Provincia da definire]',
  postalCode: '[CAP da definire]',
  country: 'Italia',
  /**
   * Nessuna mailbox Noivia configurata finché LEGAL_EMAIL_PRIVACY non è in env.
   * Non inventare un indirizzo reale: placeholder esplicito legato a LEGAL_*.
   */
  privacyEmail: '[TODO LEGAL_EMAIL_PRIVACY — privacy@ da definire]',
  supportEmail: '[TODO LEGAL_EMAIL_SUPPORT — supporto@ da definire]',
  dpoEmail: '[Email DPO / referente privacy da definire]',
  pec: '[PEC da definire]',
  phone: '[Telefono da definire]',
  rea: '[Iscrizione REA / CCIAA da definire]',
  shareCapital: '[Capitale sociale da definire]',
  /** Risolto in getCompanyProfile() via getSiteUrl() — non usare flygetr. */
  websiteUrl: '[URL sito — vedi getSiteUrl]',
} as const;
