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
  priceIsSumOfServices:
    'Stima: somma dei singoli servizi, ciascuno con contratto e fornitore propri.',
  /** Trasparenza AI (AI Act). */
  aiGenerated:
    'Itinerario generato/assistito da AI. Verifica sempre orari, prezzi e disponibilità con il fornitore.',
  /** Responsabilità. */
  responsibility:
    'NomadLink fornisce account, gruppo, itinerario e crediti. Esecuzione, cancellazioni e rimborsi di ogni servizio sono del fornitore.',
  /** Messaggio guida (onboarding, homepage, Trip). */
  guide:
    'Su NomadLink scegli un itinerario ufficiale. Poi parti da solo, con amici o su una partenza di gruppo. Ognuno prenota voli e hotel per conto proprio. Niente pacchetto, niente checkout unico.',
  /** Etichetta unica per qualsiasi cifra aggregata. */
  budgetLabel: 'Budget orientativo',
  budgetFilterLabel: 'Fascia di spesa stimata',
  budgetClarifier:
    'I costi reali dipendono dai servizi che ogni partecipante prenota separatamente.',
  /** Loyalty: nessun valore monetario. */
  pointsNoMoney:
    'I NomadPoints non hanno valore monetario, non sono convertibili in denaro e si riscattano solo in vantaggi interni alla piattaforma.',
} as const;

export const POST_THRESHOLD_CHECKLIST = [
  'Aprite la chat di gruppo e allineatevi su date e mete.',
  'Ognuno cerca voli e hotel per conto proprio: niente checkout unico.',
  'Salvate le tratte e gli alloggi scelti sul Trip, così il gruppo li vede.',
  'Confermate i documenti e le scadenze di ciascun fornitore.',
  'Chi arriva dopo la soglia trova già itinerario e stime, non un pacchetto.',
] as const;

/**
 * "Soglia del gruppo" — sostituisce "garanzia di partenza".
 * Non è un'obbligazione di viaggio di NomadLink (evita il profilo da organizzatore,
 * art. 41 D.Lgs. 62/2018): è una condizione sociale del gruppo.
 */
export function groupThresholdCopy(
  minSeats: number,
  solid: boolean,
  mode: 'participants' | 'flights' = 'participants'
): string {
  if (solid) return 'Soglia del gruppo raggiunta: avete il minimo per partire.';
  if (mode === 'flights') {
    return `Hotel e attività si sbloccano quando ${minSeats} partecipanti hanno confermato il volo (posto confermato).`;
  }
  return `Il viaggio parte se il gruppo raggiunge la soglia di ${minSeats} partecipanti.`;
}
