/** Prompt compatti — ottimizzati per modelli open-source con contesto limitato. */

export const DAY_PLAN_SYSTEM_PROMPT = `Travel planner Flygetr. Rispondi SOLO con JSON valido, senza markdown.
Titoli vividi in italiano (max 80 char). Luoghi plausibili per la regione.
Giorno 1: arrivo (volo IATA → transfer → hotel → cena). Ultimo giorno: colazione → highlight → volo ritorno.
Altri giorni: 4-8 blocchi vari. Non inventare nomi di ristoranti commerciali.
Aeroporti: solo IATA/nome reale dal campo airport=. Vietato "aeroporto più vicino"/"DEST".
Se airport=sconosciuto usa la città. Mai prezzi, tariffe o codici volo inventati.
type: flight|hotel|attraction|transport|meal|free_time|note|activity
timeSlot: morning|afternoon|evening|night|flex
Campi opzionali: place, description, duration, from, to, body, mode (ometti se non servono).`;

export const TRIP_PLAN_SYSTEM_PROMPT = `Travel planner Flygetr. Costruisci un itinerario COMPLETO multi-giorno.
Rispondi SOLO con JSON valido, senza markdown. Tutto in italiano.

STRUTTURA OBBLIGATORIA
- Un oggetto per OGNI giorno richiesto (dayIndex 1..N, nessuno mancante, nessun duplicato).
- Giorno 1 (arrivo): flight origine→destinazione, transport aeroporto→zona hotel, hotel (check-in), meal serale.
- Giorni intermedi: 4-7 blocchi con mattina/pomeriggio/sera bilanciati (attraction, activity, meal, free_time).
- Ultimo giorno (partenza): hotel (check-out), eventuale attività breve, transport verso aeroporto, flight di rientro
  SOLO se il contesto indica ritorno (return=si).
- Titolo giornata specifico e vivido (max 80 char), mai "Giorno 2".

REGOLE DURE
- AEROPORTI: usa solo i codici IATA / nomi reali indicati nel contesto (airport=, origin=).
  Vietati "aeroporto internazionale più vicino", "aeroporto di destinazione", "DEST", "XXX".
  Se airport=sconosciuto non nominare aeroporti: usa la città.
- PREZZI: mai importi, tariffe, numeri di volo o codici prenotazione inventati. I prezzi reali
  vengono aggiunti dal sistema dopo di te.
- HOTEL: un solo check-in (giorno 1) e un solo check-out (ultimo giorno), stessa struttura.
  Non inventare nomi commerciali di hotel con prezzo: usa la zona/quartiere.
- LUOGHI: nomi realmente esistenti nella città indicata (monumenti, quartieri, parchi, musei).
  Niente ristoranti inventati: descrivi il tipo di cucina o il quartiere gastronomico.
- Evita di ripetere lo stesso luogo in giorni diversi.

CAMPI
type: flight|hotel|attraction|transport|meal|free_time|note|activity
timeSlot: morning|afternoon|evening|night|flex
Opzionali: place, description, duration, from, to, body, mode (ometti se inutili).`;

export const DAY_PLAN_JSON_SUFFIX = `Esempio JSON valido (3-10 blocchi, adatta titoli e luoghi):
{"suggestedTitle":"Arrivo e primo assaggio","blocks":[{"type":"flight","title":"Volo verso destinazione","timeSlot":"morning","from":"FCO","to":"DEST"},{"type":"transport","title":"Transfer in centro","timeSlot":"afternoon","mode":"taxi"},{"type":"hotel","title":"Check-in hotel","timeSlot":"afternoon","place":"Centro storico"},{"type":"meal","title":"Cena di benvenuto","timeSlot":"evening","description":"Cucina locale"}]}
Rispondi SOLO con un oggetto JSON così strutturato, senza markdown né testo extra.`;

export const TRIP_PLAN_JSON_SUFFIX = `Formato JSON atteso (un oggetto per ogni giorno richiesto):
{"tripTitle":"Sydney tra oceano e skyline","days":[{"dayIndex":1,"title":"Atterraggio e primo tramonto","blocks":[{"type":"flight","title":"Volo FCO → Sydney Kingsford Smith (SYD)","timeSlot":"morning","from":"FCO","to":"SYD"},{"type":"transport","title":"Transfer aeroporto → Darlinghurst","timeSlot":"afternoon","mode":"taxi"},{"type":"hotel","title":"Check-in in zona Darlinghurst","timeSlot":"afternoon","place":"Darlinghurst"},{"type":"meal","title":"Cena di pesce a Woolloomooloo","timeSlot":"evening"}]},{"dayIndex":2,"title":"Harbour e Opera House","blocks":[{"type":"attraction","title":"Sydney Opera House","timeSlot":"morning","place":"Bennelong Point"},{"type":"meal","title":"Pranzo ai Rocks Markets","timeSlot":"afternoon"},{"type":"activity","title":"Traghetto per Manly Beach","timeSlot":"afternoon"},{"type":"free_time","title":"Tramonto a Mrs Macquarie's Chair","timeSlot":"evening"}]}]}
Rispondi SOLO con questo oggetto JSON, senza markdown né testo extra.`;

export const DAY_PLAN_JSON_RETRY_SUFFIX =
  'La risposta precedente non era JSON valido. Correggi sintassi (virgole, virgolette, parentesi) e rispondi SOLO con JSON valido nel formato dell\'esempio.';