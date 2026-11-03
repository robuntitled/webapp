/**
 * Modulo informativo — servizi turistici collegati (D.Lgs. 79/2011 Allegato B).
 *
 * ⚠️ BOZZA, da revisione avvocato. Non è una consulenza legale.
 * Non inventare dati societari: solo LEGAL_PLACEHOLDERS / getCompanyProfile().
 *
 * Da mostrare PRIMA del pagamento del volo (e in checkout hotel) quando esiste
 * il percorso «Continua con hotel» / servizi successivi sullo stesso viaggio.
 */

import { BRAND_NAME } from '@/lib/brand';
import { LEGAL_PLACEHOLDERS } from '@/lib/privacy/company.defaults';

export const ALLEGATO_B_DRAFT_BANNER =
  'BOZZA, da revisione avvocato — D.Lgs. 79/2011 Allegato B (servizi turistici collegati).';

export type AllegatoBLinkedCopy = {
  banner: string;
  title: string;
  paragraphs: string[];
};

/**
 * Testo informativo bozza. I placeholder LEGAL_* restano espliciti finché
 * non sono compilati in env (nessun dato societario inventato).
 */
export function getAllegatoBLinkedDraftCopy(opts?: {
  companyName?: string;
  tradeName?: string;
}): AllegatoBLinkedCopy {
  const company = opts?.companyName?.trim() || LEGAL_PLACEHOLDERS.companyName;
  const trade = opts?.tradeName?.trim() || LEGAL_PLACEHOLDERS.tradeName || BRAND_NAME;

  return {
    banner: ALLEGATO_B_DRAFT_BANNER,
    title: 'Informativa sui servizi turistici collegati',
    paragraphs: [
      `Se, dopo aver scelto e pagato un servizio di viaggio, prenoti servizi aggiuntivi per lo stesso viaggio o la stessa vacanza tramite ${trade}, NON beneficerai dei diritti che si applicano ai pacchetti turistici ai sensi della direttiva (UE) 2015/2302 e del D.Lgs. 79/2011.`,
      `Tuttavia, se prenoti servizi di viaggio aggiuntivi durante la stessa visita al sito o entro 24 ore dalla conferma della prima prenotazione tramite ${trade}, tali servizi costituiranno un servizio turistico collegato. In tal caso, come previsto dalla normativa, ${trade} dispone di una protezione per rimborsare i pagamenti che riceve per servizi non effettuati a causa della sua insolvenza. Nota: ${ALLEGATO_B_DRAFT_BANNER}`,
      `Maggiori informazioni sulla protezione in caso di insolvenza (BOZZA): contattare ${LEGAL_PLACEHOLDERS.supportEmail}. Facilitatore indicato: ${company} (P.IVA ${LEGAL_PLACEHOLDERS.vatId}; sede ${LEGAL_PLACEHOLDERS.addressLine}, ${LEGAL_PLACEHOLDERS.postalCode} ${LEGAL_PLACEHOLDERS.city}).`,
      'Ogni servizio (volo, hotel, altro) è un contratto separato con il rispettivo fornitore. Non esiste un prezzo totale del viaggio né un unico checkout. Conserva le condizioni di ciascun fornitore.',
    ],
  };
}
