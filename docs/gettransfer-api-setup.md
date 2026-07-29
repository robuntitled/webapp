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
```

- **Sandbox:** `GETTRANSFER_ENV=sandbox` → `https://gtrbox.org/api`
- **Produzione:** omit o `live` → `https://gettransfer.com/api`

## 3. Affiliate (commissioni)

Restano le variabili client già documentate in `.env.example`:

- `NEXT_PUBLIC_TRAVELPAYOUTS_MARKER` (o `NEXT_PUBLIC_GETTRANSFER_MARKER`)
- `NEXT_PUBLIC_GETTRANSFER_PROMO_ID=4439`

Il CTA «Continua prenotazione» usa `buildGetTransferAffiliateHandoff`.

## 4. Pagamento white-label (non MVP)

L'API permette `POST /api/payments` con `gateway_type: ground` dal **saldo partner**. Richiede token + saldo e termini con l'account manager Travelpayouts. NomadLink non implementa questo flusso finché non è esplicitamente abilitato.

## 5. Verifica

1. Imposta token + `GETTRANSFER_ENV=sandbox`
2. Accedi a NomadLink → Prenota → Trasporti → Taxi
3. Cerca un tragitto (data almeno 6 ore nel futuro)
4. Dovresti vedere le card con prezzi; il pagamento avviene su GetTransfer
