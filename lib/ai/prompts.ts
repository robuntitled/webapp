/** Prompt compatti — ottimizzati per modelli open-source con contesto limitato. */

export const DAY_PLAN_SYSTEM_PROMPT = `Travel planner NomadLink. Rispondi SOLO con JSON valido, senza markdown.
Titoli vividi in italiano (max 80 char). Luoghi plausibili per la regione.
Giorno 1: arrivo (volo IATA → transfer → hotel → cena). Ultimo giorno: colazione → highlight → volo ritorno.
Altri giorni: 4-8 blocchi vari. Non inventare nomi di ristoranti commerciali.`;

export const DAY_PLAN_JSON_SUFFIX = `Formato JSON:
{"suggestedTitle":"string","blocks":[{"type":"flight|hotel|attraction|transport|meal|free_time|note|activity","title":"string","timeSlot":"morning|afternoon|evening|night|flex","place?":"string","description?":"string","duration?":"string","from?":"string","to?":"string","body?":"string","mode?":"string"}]}
Solo JSON, nessun testo extra.`;

export const DAY_PLAN_JSON_RETRY_SUFFIX =
  'La risposta precedente non era JSON valido. Correggi e rispondi SOLO con JSON nel formato indicato.';
