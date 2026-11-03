/**
 * Modulo informativo — servizi turistici collegati (D.Lgs. 79/2011 Allegato B).
 *
 * Fonte bozza: `nuovo-flusso-legale.md` §L1.4 / L3.1 (allegato uploads).
 * ⚠️ BOZZA, da revisione avvocato. Non è una consulenza legale.
 * Testo esatto da Gazzetta/Allegato B da confermare (R).
 * Non inventare dati societari: solo LEGAL_PLACEHOLDERS.
 *
 * Da mostrare PRIMA del pagamento del primo servizio quando il flusso propone
 * poi altri (es. «Continua con hotel»), e di nuovo nel checkout del secondo.
 */

import { BRAND_NAME } from '@/lib/brand';
import { LEGAL_PLACEHOLDERS } from '@/lib/privacy/company.defaults';

export const ALLEGATO_B_DRAFT_BANNER =
  'BOZZA, da revisione avvocato — D.Lgs. 79/2011 Allegato B / Dir. (UE) 2015/2302 (servizi turistici collegati). Fonte: nuovo-flusso-legale §L1.4.';

export type AllegatoBLinkedCopy = {
  banner: string;
  title: string;
  paragraphs: string[];
};

/**
 * Modulo standard LTA (bozza).
 * Contenuto richiesto dal Legale §L1.4: (a) niente diritti da pacchetto,
 * ogni fornitore risponde solo del proprio servizio; (b) protezione insolvenza
 * sui pagamenti ricevuti dal facilitatore — da verificare con avvocato se il
 * ricarico Nuitée conti come «pagamento ricevuto» da Noivia.
 */
export function getAllegatoBLinkedDraftCopy(opts?: {
  companyName?: string;
  tradeName?: string;
}): AllegatoBLinkedCopy {
  const company = opts?.companyName?.trim() || LEGAL_PLACEHOLDERS.companyName;
  const trade = opts?.tradeName?.trim() || LEGAL_PLACEHOLDERS.tradeName || BRAND_NAME;

  return {
    banner: ALLEGATO_B_DRAFT_BANNER,
    title: 'Modulo informativo standard — servizi turistici collegati',
    paragraphs: [
      // (a) Diritti da pacchetto — Allegato B / Dir. 2015/2302 Annex II
      `Se, dopo aver scelto un servizio turistico e averlo pagato, prenoti servizi turistici aggiuntivi per il tuo viaggio o la tua vacanza tramite ${trade}, NON beneficerai dei diritti applicabili ai pacchetti ai sensi della direttiva (UE) 2015/2302 e del D.Lgs. 79/2011. Pertanto, ${trade} non sarà responsabile della corretta esecuzione di tali servizi turistici aggiuntivi. In caso di problemi, rivolgiti al pertinente prestatore di servizi.`,
      // (b) LTA + insolvenza
      `Tuttavia, se prenoti servizi turistici aggiuntivi durante la stessa visita al sito di ${trade} oppure entro 24 ore dalla conferma della prenotazione del primo servizio turistico, tali servizi costituiranno un servizio turistico collegato. In tal caso ${trade} dispone, come prescritto dal diritto dell’Unione, di una protezione per rimborsare i pagamenti che riceve per servizi non eseguiti a causa della propria insolvenza. Nota: questa protezione non costituisce una restituzione in caso di insolvenza del pertinente prestatore di servizi.`,
      // Contatti / dati — solo placeholder LEGAL_* (nessun dato inventato)
      `Ulteriori informazioni sulla protezione in caso di insolvenza (BOZZA, da revisione avvocato): ${LEGAL_PLACEHOLDERS.supportEmail}. Facilitatore indicato: ${company} · P.IVA ${LEGAL_PLACEHOLDERS.vatId} · sede ${LEGAL_PLACEHOLDERS.addressLine}, ${LEGAL_PLACEHOLDERS.postalCode} ${LEGAL_PLACEHOLDERS.city} (${LEGAL_PLACEHOLDERS.country}).`,
      // Chiarimento operativo allineato a G1/G3 del Legale
      'Ogni servizio (volo, hotel, altro) è un contratto separato con il rispettivo fornitore. Non esiste un prezzo totale del viaggio né un unico checkout. Conserva le condizioni di ciascun fornitore.',
    ],
  };
}
