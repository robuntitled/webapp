# IA v1.1 — mappa route e migrazione

## Canoniche (nuove)

| Area | Path | Note |
|------|------|------|
| Guest home | `/` | Marketing + login/registrazione |
| Hub | `/hub` | Loggato only; guest → `/?callbackUrl=/hub` |
| Scopri | `/scopri` | Viaggi (+ mappa in seguito) |
| Organizza | `/organizza` | Wizard composer |
| I miei | `/i-miei` | Hub trip personali |
| Prenota | `/prenota/*` | Default: scegli viaggio (UI in step successivi) |
| Messaggi | `/messaggi` | Inbox chat |
| Profilo | `/profilo` | Edit profilo |
| Impostazioni | `/impostazioni` | Settings |
| Preferiti | `/preferiti` | Preferiti trip |
| Costi admin | `/costi` | Solo admin |
| Trip | `/viaggi/[id]` | Invariato |
| Profilo pubblico | `/u/[username]` | Invariato |

## Legacy → canoniche

| Legacy | Destinazione |
|--------|----------------|
| `/dashboard` | `/scopri` |
| `/dashboard/cerca` | `/scopri/cerca` |
| `/dashboard/crea` | `/organizza` |
| `/dashboard/miei-viaggi` | `/i-miei` |
| `/dashboard/preferiti` | `/preferiti` |
| `/dashboard/profilo` | `/profilo` |
| `/dashboard/impostazioni` | `/impostazioni` |
| `/dashboard/costi` | `/costi` |
| `/dashboard/bacheca` | `/scopri` (bacheca non in nav; feed posticipato) |

## Redirect middleware

- Loggato su `/` (senza restare su auth) → `/hub`  
  *Nota: se c’è `callbackUrl` query, si rispetta dopo login lato client.*
- Guest su `/hub` → `/?callbackUrl=/hub`
- GDPR incompleto → `/completa-registrazione` (invariato)
- Post completa-registrazione → `/hub`
