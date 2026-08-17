# NomadLink — Documento completo di prodotto

Fonte di verità per build, copy e decisioni. Non ibridare con un modello tour operator.

---

## 1. Visione e posizionamento

NomadLink è una **piattaforma tecnologica di intermediazione pura** (pure brokerage) per l’organizzazione autonoma di viaggi di gruppo.

**Non è un tour operator.**  
Non gestisce coordinatori, non organizza la logistica in destinazione, non interviene nella relazione tra utenti e fornitori. Gli utenti creano o si uniscono a viaggi, personalizzano l’itinerario e prenotano i servizi (voli, hotel, auto, attrazioni) tramite API di brokeraggio.

**Proposta di valore centrale:**  
«Organizza il tuo viaggio di gruppo in autonomia, prenota i servizi a condizioni di mercato e spendi meno rispetto ai tour operator tradizionali, recuperando parte della spesa con il cashback.»

**Differenziazione rispetto ai competitor:**

- WeRoad, SiVola, Viandar, Avventure nel Mondo → sono tour operator (anche se “social”).
- NomadLink → piattaforma di intermediazione + tool di pianificazione (AI + mappa) + cashback.

---

## 2. Analisi di mercato e competitor

**Mercato italiano viaggi di gruppo:**

- Il 42% degli italiani è interessato a viaggi di gruppo (picco 45–51% tra 18–44 anni).
- Interesse in crescita, soprattutto per turismo relazionale e “economia della solitudine”.

**Dati competitor (2025):**

- **WeRoad**: ≈ 130 milioni € di ricavi, ~110.000 passeggeri/anno. Forte community, coordinatori, brand culturale.
- **SiVola**: 67,8–69 milioni € di ricavi, EBITDA ≈ 2,3 milioni €, utile netto ≈ 893.000 €. 25.000 passeggeri nel 2025. Nata da travel influencer, forte trasparenza, voli spesso inclusi.
- **Avventure nel Mondo**: storico (dal 1970), >50.000–70.000 viaggiatori/anno, modello collaborativo e auto-gestito, coordinatori non pagati (viaggiano gratis).
- Agenzie tradizionali: margini alti, scarsa digitalizzazione.

**Nota su SiVola:** il margine non è 14 milioni. L’EBITDA reale è circa 2,3 milioni €. Il modello dei tour operator ha marginalità percentuali basse.

---

## 3. Modello di business e unit economics

- Commissione media lorda dalle API: **≈ 5%** (LiteAPI configurabile, Viator ~8%, Duffel Cars ~5%).
- Cashback:
  - Creatore / Fondatore: **2,0%** (maggiorabile in fase di lancio)
  - Partecipante: **1,2 – 1,5%**
- **Margine netto residuo per NomadLink: ≈ 3,3 – 3,5%**

**Esempio:** 5 milioni € di GMV → margine netto ≈ 165.000 – 175.000 €.

**Target realistici:**

- Anno 1 (2027): 1,5–2,5 milioni € GMV → 50–85k € di margine
- Anno 2: 6–10 milioni € GMV
- Anno 3: 18–30 milioni € GMV

---

## 4. SWOT

**Strengths:** modello leggero e scalabile, potenziale di risparmio, AI + mappa, cashback, architettura basata su API.

**Weaknesses:** assenza di brand, accesso limitato ad API di alto livello, budget marketing contenuto, dipendenza dai fornitori, team piccolo, margine netto sottile.

**Opportunities:** crescita del turismo di gruppo e relazionale, domanda di flessibilità, possibilità di costruire community e network effects, evoluzione verso API premium.

**Threats:** competitor capitalizzati (WeRoad, SiVola), aumento costi API/Google Maps, clawback su cancellazioni, difficoltà di acquisizione con budget limitato.

---

## 5. Cold start e soluzione

Il pure self-made ha un cold start grave (servono contemporaneamente creatori e partecipanti).

**Soluzione principale:** template di viaggio preimpostati (organizzati per durata). L’utente può:

- usarli così come sono
- modificarli
- creare da zero

**La durata è la variabile centrale:** se si riducono i giorni, il sistema elimina automaticamente tappe/attività secondarie.

Altre leve:

- Seed Controlled Supply (primi viaggi creati/selezionati da noi)
- Incentivi asimmetrici molto forti ai Creator nei primi mesi
- Concentrazione iniziale su poche destinazioni/tipologie
- Garanzia di partenza
- Community offline prima del lancio

---

## 6. Target e buyer personas

**Target di lancio:** 25–40 anni (focus 27–38), già abituati a organizzare in autonomia, price-sensitive, aperti all’AI, vogliono socialità senza il markup e la rigidità dei tour operator.

1. **Creatore Pragmatico (Marco, 32)** — controllo, odia il caos, allarga il gruppo.  
   VP: «Crea il tuo viaggio di gruppo in pochi minuti partendo da un modello già pronto…»
2. **Partecipante Selettiva (Giulia, 29)** — ha fatto tour tradizionali, li trova cari.  
   VP: «Unisciti a viaggi di gruppo già strutturati ma flessibili, con prezzi trasparenti…»
3. **Coppia Organizzatrice (Luca & Sara)** — viaggiano con amici, vogliono ordine.  
   VP: «Organizzate il prossimo viaggio con gli amici in modo semplice e ordinato…»

---

## 7. Funnel di conversione

1. Awareness  
2. Interest & Consideration  
3. Registration + Activation  
4. Core Conversion → Crea **oppure** Unisciti  
5. Formazione gruppo + Garanzia di partenza  
6. Booking servizi  
7. Retention + Referral + Cashback

**North star iniziali:** Activation Rate, % viaggi che raggiungono il minimo, GMV per utente attivo.

---

## 8. Marketing di lancio

- Organico + community come spina dorsale (how-to, confronti di risparmio, UGC, SEO).
- Meta Ads (Instagram/Facebook).
- Google Ads su keyword ad alta intenzione.
- Micro-influencer (8–40k) nicchia viaggio/organizzazione/budget.
- Eventi offline e meet-up per seed di community.

Budget marketing iniziale consigliato: 45–60k € (20k è troppo stretto).

---

## 9. Architettura webapp definitiva

**LOGIN → CREA | ESPLORA/UNISCITI**

**CREA:** Template (principale) / Modifica / Da zero → config (destinazione, durata, date, tipo gruppo, posti) → editor AI + mappa → pubblica “In formazione” + garanzia di partenza → **prenotazione servizi solo a gruppo formato**.

**ESPLORA:** Filtri + In evidenza (Seed) + In chiusura (FOMO) → dettaglio (mappa, creator, posti, cashback, Unisciti) → prenotazione dopo adesione e formazione.

**Trasversali obbligatori:** FOMO autentica, fiducia creator (profilo, rating, recensioni), cashback visibile, area Per i Creator, onboarding leggero (niente nome/età all’inizio).

**Vietato:** “Salva Volo → Hotel → Attrazioni” subito dopo la creazione.

Motore prenotazioni: LiteAPI voli/hotel, Viator attrazioni, Duffel Cars.

---

## 10. FOMO

Solo FOMO autentica:

- Posti rimasti reali
- «Si è unito X minuti fa»
- Sezione In chiusura
- Counter di attività
- Cashback stimato visibile
- Scadenze di iscrizione

Niente false scarsità.

---

## 11. Decisioni confermate

- Pure brokerage (non ibrido tour operator)
- Template come anti-cold-start centrale
- Durata come variabile primaria di rimodulazione
- Onboarding leggero
- Prenotazioni solo dopo formazione gruppo
- Target autonomi price-sensitive (non attacco frontale WeRoad/SiVola)
- Cashback 2% creator / 1,2–1,5% partecipanti
- Incentivi asimmetrici fortissimi ai creator nei primi 6–12 mesi
- Seed di viaggi reali all’inizio

---

## 12. Cosa è nel prodotto (webapp)

- LOGIN → CREA | ESPLORA/UNISCITI
- Template: **Usa** (editor) vs **Modifica** (config + durata)
- Durata 5/7/10 giorni rimodula l’itinerario (tappa secondarie via)
- Pubblicazione **In formazione** + garanzia di partenza; prenotazioni sbloccate al minimo posti
- Esplora: In evidenza (seed live + template), In chiusura, FOMO reale (posti, ultimo join, scadenza)
- Prenota hub: banner + link ai viaggi formati; pannello viaggio: voli, hotel, auto, attività
- Cashback visibile (2%+ creator / 1,2–1,5% partecipanti) + ledger su prenotazione confermata (`/dashboard/cashback`)
- Onboarding leggero (intent + interessi + casa, niente nome/età all’inizio)
