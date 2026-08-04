# GetTransfer API — setup NomadLink

NomadLink mostra le quote transfer in-app via `GET /api/route_info`. Il pagamento resta su GetTransfer (link affiliate Travelpayouts) finché non avete saldo partner e accordo con l'account manager per `POST /api/payments`.

## 1. Richiedi il token

**A:** support@travelpayouts.com  
**Oggetto:** GetTransfer API access token  

Corpo suggerito (copia e incolla):

```
Hello,

I would like to request an X-ACCESS-TOKEN for the GetTransfer API integration.

- Travelpayouts registration email: [your email]
- Project: NomadLink (web app for digital nomads / travel booking)
- Travelpayouts marker: 748861
- Environments needed: test (gtrbox.org) and production (gettransfer.com)

Use case: in-app transfer price search on NomadLink; booking handoff via affiliate links (payment on GetTransfer). We are not implementing partner-balance payment in MVP.

Thank you.
```

## 2. Variabili d'ambiente (server-only)

In `.env.local` / Vercel ( **non** `NEXT_PUBLIC_` ):

```bash
GETTRANSFER_ACCESS_TOKEN=your_token_here
GETTRANSFER_ENV=sandbox   # sandbox | live (default: live)
# GETTRANSFER_API_BASE=   # optional override
# GETTRANSFER_DEBUG=1     # logga l'URL grezzo di /route_info (console.debug)
# GETTRANSFER_DATE_TO_OFFSET=+03:00   # forza un offset esplicito su date_to
```

- **Sandbox:** `GETTRANSFER_ENV=sandbox` → `https://gtrbox.org/api`
- **Produzione:** omit o `live` → `https://gettransfer.com/api`

## 2b. `GET /api/route_info` — parametri richiesti dalla spec

Riferimento: PDF ufficiale *GetTransfer.com API book_now updated* (Travelpayouts, ago 2026).

- **`points[]` con parentesi:** `points[]=(lat,lng)` → codificato `%28lat%2Clng%29`.
- **`countries[]` è obbligatorio.** Un solo codice se la tratta è interna a un paese, due (ordine partenza → destinazione) se è cross-border:
  - `points[]=(41.28,28.72)&points[]=(41.04,28.98)&countries[]=TR`
  - `points[]=(25.204849,55.270783)&points[]=(23.588030,58.382944)&countries[]=AE&countries[]=OM`
  - I codici ISO2 arrivano da `searchPlaces` / `parseNominatimResult` (`countryCode`) oppure dal catalogo aeroporti lato client. Se ignoti il parametro viene omesso (mai vuoto).
- **Anticipo minimo 24 ore** (non 6): validato in `lib/gettransfer/pickup-window.ts` e nel form transfer.
- **`date_to` e fuso orario:** gli esempi della spec includono sempre un offset locale al punto di pickup (`2026-07-15T18:30:00+07:00`). NomadLink invia di default il formato naive `YYYY-MM-DDTHH:mm:00` perché non risolve il fuso della destinazione. ⚠️ **Da verificare in sandbox appena arriva il token**: se l'API interpreta il naive come UTC va impostato `GETTRANSFER_DATE_TO_OFFSET` (o va risolto il fuso per punto). Con `GETTRANSFER_DEBUG=1` l'URL completo della richiesta viene loggato.

### Limite del sandbox

Nell'ambiente di test (`gtrbox.org`) le offerte **`book_now` esistono solo per Istanbul (IST) e Londra Heathrow**. Su qualsiasi altra tratta la risposta arriva senza offerte: non è un bug dell'integrazione. In sandbox l'API NomadLink restituisce in questo caso un `hint` esplicito mostrato nella UI.

## 3. Affiliate (commissioni)

Restano le variabili client già documentate in `.env.example`:

- `NEXT_PUBLIC_TRAVELPAYOUTS_MARKER` (o `NEXT_PUBLIC_GETTRANSFER_MARKER`)
- `NEXT_PUBLIC_GETTRANSFER_PROMO_ID=4439`

Il CTA «Continua prenotazione» usa `buildGetTransferAffiliateHandoff`.

## 4. Flusso di prenotazione completo (non implementato — riferimento spec)

Documentato qui per il futuro; **oggi NomadLink si ferma a `route_info` + handoff affiliate**.

### 4.1 Creazione transfer — `POST /api/transfers`

- Richiede **nome + coordinate** del punto: il solo nome fallisce. In alternativa il `place_id` Google.
- Campi supportati: `child_seats_infant`, `child_seats_convertible`, `child_seats_booster`, `name_sign`, `comment`, `flight_number`, `partner_passenger`, `promo_code`.
- L'email dell'utente deve essere **reale** (regola Travelpayouts).

### 4.2 Pagamento — `POST /api/payments`

- `gateway_id: "ground"` — ⚠️ la vecchia doc help-center indicava `gateway_type`, la spec aggiornata usa `gateway_id`.
- Richiede anche `book_now_transport_type`.
- Addebito sul **saldo partner** (serve accordo con l'account manager Travelpayouts).
- Finestra di cancellazione gratuita per i partner: **24h** (`refund_period: 24`).

### 4.3 Post-booking

| Azione | Endpoint | Note |
| --- | --- | --- |
| Cancellazione | `POST /api/transfers/:id/cancel` | |
| Rimborso | `POST /api/transfers/:id/refund` | |
| Voucher | `GET /api/transfers/voucher/:id` | |
| Autista / veicolo | `GET /api/transfers/:id/offers` | disponibile **solo** dopo stato `performed` |
| Callback di stato | — | da concordare con l'account manager |

### 4.4 Regole Travelpayouts già concordate

- **Nessuna cache dei prezzi** (sempre richiesta live).
- Prezzi mostrati come **«da …»** (prezzo di partenza), mai come tariffa definitiva.
- Email utente reale obbligatoria alla creazione del transfer.

## 5. Verifica

1. Imposta token + `GETTRANSFER_ENV=sandbox` (opzionale `GETTRANSFER_DEBUG=1`)
2. Accedi a NomadLink → Prenota → Trasporti → Taxi
3. Cerca un tragitto **con almeno 24 ore di anticipo**, usando Istanbul (IST) o Londra Heathrow: in sandbox le altre tratte non hanno offerte `book_now`
4. Dovresti vedere le card con prezzi; il pagamento avviene su GetTransfer
5. Controlla nei log l'URL grezzo: deve contenere `points[]=(lat,lng)` codificato e uno o due `countries[]`
