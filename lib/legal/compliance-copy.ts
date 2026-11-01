import { BRAND_NAME } from '@/lib/brand';

/**
 * Copy di compliance centralizzata (modello "tool + facilitatore di servizi collegati").
 *
 * Base normativa: D.Lgs. 79/2011 (Codice del turismo) art. 18; D.Lgs. 62/2018
 * artt. 33, 40, 49, 51-sexies; Codice del consumo D.Lgs. 206/2005 artt. 20-22, 49;
 * DPR 430/2001 art. 6; Reg. (UE) 2024/1689 (AI Act) trasparenza.
 *
 * Regola guida: la qualificazione giuridica reale deve coincidere con ciò che
 * dichiariamo. Noivia = piattaforma di planning + suggerimenti; l'esecuzione
 * di ogni servizio è del rispettivo fornitore. Nessun pacchetto, nessun prezzo
 * globale, nessun checkout unico.
 */

export const COMPLIANCE_COPY = {
  /** Da mostrare vicino a qualsiasi elenco di servizi prenotabili. */
  separateBooking: 'Ogni servizio è prenotato separatamente con il rispettivo fornitore.',
  /** Disclaimer di qualificazione, ripetuto nei punti in cui si aggregano servizi. */
  notAPackage: `${BRAND_NAME} ti aiuta a pianificare il viaggio e a trovare compagni di viaggio. Ogni servizio è prenotato separatamente con il fornitore indicato al momento del pagamento.`,
  /** Prezzo: mai "totale viaggio". Solo somma di contratti separati. */
  priceIsSumOfServices:
    'Stima: somma dei singoli servizi, ciascuno con contratto e fornitore propri.',
  /**
   * Checkout voli/hotel: chi vende e chi è merchant of record.
   * Fatti da codice/config (LiteAPI / Nuitee Connect). Ragione sociale completa: LEGAL_*.
   */
  checkoutMerchantOfRecord:
    'Prenotazione e pagamento gestiti da LiteAPI / Nuitée (payment processor e merchant of record). Noivia agisce come intermediario.',
  /**
   * Hotel: il totale mostrato include già il markup LiteAPI (LITEAPI_MARGIN / default 10%).
   * Non esporre la % al cliente; solo che il prezzo include la commissione di servizio.
   */
  hotelServiceFeeIncluded: `Il prezzo include il costo del servizio ${BRAND_NAME}.`,
  /** Trasparenza AI (AI Act). */
  aiGenerated:
    'Itinerario generato/assistito da AI. Verifica sempre orari, prezzi e disponibilità con il fornitore.',
  /** Responsabilità. */
  responsibility:
    'Noivia fornisce account, gruppo e itinerario. Esecuzione, cancellazioni e rimborsi di ogni servizio sono del fornitore.',
  /** Messaggio guida (onboarding, homepage, Trip). */
  guide: `Su ${BRAND_NAME} scegli un itinerario pronto. Poi parti da solo, con amici o con un gruppo. Voli e hotel li scegli e li paghi tu, servizio per servizio.`,
  /** Etichetta unica per qualsiasi cifra aggregata. */
  budgetLabel: 'Budget orientativo',
  budgetFilterLabel: 'Fascia di spesa stimata',
  budgetClarifier:
    'I costi reali dipendono dai servizi che ogni partecipante prenota separatamente.',
} as const;

export const POST_THRESHOLD_CHECKLIST = [
  'Aprite la chat di gruppo e allineatevi su date e mete.',
  'Ognuno cerca voli e hotel per conto proprio: niente checkout unico.',
  'Salvate le tratte e gli alloggi scelti sul Trip, così il gruppo li vede.',
  'Confermate i documenti e le scadenze di ciascun fornitore.',
  'Chi arriva dopo trova già itinerario e stime, non un pacchetto.',
] as const;

/**
 * Legacy helper — avoid new user-facing threshold copy; kept for internal references.
 */
export function groupThresholdCopy(
  minSeats: number,
  solid: boolean,
  mode: 'participants' | 'flights' = 'participants'
): string {
  if (solid) return 'Gruppo in formazione';
  if (mode === 'flights') {
    return `Hotel e attività si sbloccano quando ${minSeats} partecipanti hanno confermato il volo (posto confermato).`;
  }
  return `Il viaggio parte se il gruppo raggiunge ${minSeats} partecipanti.`;
}
