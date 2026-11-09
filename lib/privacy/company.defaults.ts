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
   * Nessuna mailbox Noivia configurata finché LEGAL_EMAIL_* non è in env.
   * Non inventare un indirizzo: copy neutrale per UI (isPlaceholder resta true).
   */
  privacyEmail: 'Contatto in definizione',
  supportEmail: 'Contatto in definizione',
  dpoEmail: '[Email DPO / referente privacy da definire]',
  pec: '[PEC da definire]',
  phone: '[Telefono da definire]',
  rea: '[Iscrizione REA / CCIAA da definire]',
  shareCapital: '[Capitale sociale da definire]',
  /** Risolto in getCompanyProfile() via getSiteUrl() — non usare flygetr. */
  websiteUrl: '[URL sito — vedi getSiteUrl]',
} as const;
