# Duffel Cars — setup NomadLink

Prenota auto in-app: Search → Quote → Book via Duffel (`POST /cars/search|quotes|bookings`).
MVP: solo tariffe **postpaid** (paga al ritiro, niente carta).

## Account

1. [app.duffel.com](https://app.duffel.com) — signup (~1 min)
2. Developers → Access tokens → **test** (`duffel_test_…`)
3. Richiedi accesso a **Duffel Cars**
4. Env server-only:

```
DUFFEL_ACCESS_TOKEN=duffel_test_...
```

Su Vercel: Project → Settings → Environment Variables → Production (e Preview se vuoi).

## Flusso UI

`/prenota/auto` → `/api/duffel/cars/search` → scegli rate → `/api/duffel/cars/quotes` → dati conducente → `/api/duffel/cars/book`.

Guarantee/prepaid restano visibili ma non prenotabili finché non c’è Duffel Payments (carta).

## Test

Sandbox spesso ha inventario su città UK (es. Heathrow). Se 403: Cars non abilitato sull’account.
