/**
 * Copy di compliance centralizzata (modello "tool + facilitatore di servizi collegati").
 *
 * Base normativa: D.Lgs. 79/2011 (Codice del turismo) art. 18; D.Lgs. 62/2018
 * artt. 33, 40, 49, 51-sexies; Codice del consumo D.Lgs. 206/2005 artt. 20-22, 49;
 * DPR 430/2001 art. 6; Reg. (UE) 2024/1689 (AI Act) trasparenza.
 *
 * Regola guida: la qualificazione giuridica reale deve coincidere con ciò che
 * dichiariamo. NomadLink = piattaforma di planning + suggerimenti; l'esecuzione
 * di ogni servizio è del rispettivo fornitore. Nessun pacchetto, nessun prezzo
 * globale, nessun checkout unico.
 */

export const COMPLIANCE_COPY = {
  /** Da mostrare vicino a qualsiasi elenco di servizi prenotabili. */
  separateBooking: 'Ogni servizio è prenotato separatamente con il rispettivo fornitore.',
  /** Disclaimer di qualificazione, ripetuto nei punti in cui si aggregano servizi. */
  notAPackage: 'NomadLink non organizza pacchetti turistici né vende viaggi.',
  /** Prezzo: mai "totale viaggio". Solo somma di contratti separati. */
  priceIsSumOfServices: 'Stima: somma dei singoli servizi, ciascuno con contratto e fornitore propri.',
  /** Trasparenza AI (AI Act). */
  aiGenerated: 'Itinerario generato/assistito da AI. Verifica sempre orari, prezzi e disponibilità con il fornitore.',
  /** Responsabilità. */
  responsibility:
    'NomadLink fornisce account, gruppo, itinerario e crediti. Esecuzione, cancellazioni e rimborsi di ogni servizio sono del fornitore.',
} as const;

/**
 * "Soglia del gruppo" — sostituisce "garanzia di partenza".
 * Non è un'obbligazione di viaggio di NomadLink (evita il profilo da organizzatore,
 * art. 41 D.Lgs. 62/2018): è una condizione sociale del gruppo.
 */
export function groupThresholdCopy(minSeats: number, solid: boolean): string {
  if (solid) return 'Gruppo al completo: avete raggiunto il minimo per partire.';
  return `Il viaggio parte se il gruppo raggiunge ${minSeats} partecipanti.`;
}
