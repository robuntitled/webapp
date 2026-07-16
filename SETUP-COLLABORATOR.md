# Setup collaboratore — NomadLink

Guida per installare il progetto da GitHub e ottenere le stesse variabili d'ambiente configurate su Vercel.

> Le API keys **non sono su GitHub**. Vivono su Vercel o nel tuo `.env.local` locale (mai committato).

---

## Prerequisiti

- Node.js 20+
- Git
- Account GitHub con accesso al repo `robuntitled/webapp`
- Accesso al progetto Vercel **webapp** (chiedi un invito al maintainer)

---

## 1. Clone e installazione

```bash
git clone https://github.com/robuntitled/webapp.git
cd webapp
npm install
```

---

## 2. Variabili d'ambiente

### Opzione A — Da Vercel (consigliata)

```bash
npx vercel login
npx vercel link
# Seleziona team + progetto "webapp"

npx vercel env pull .env.local --environment=production
```

Questo crea `.env.local` con gli stessi valori di produzione.

### Opzione B — File ricevuto dal maintainer

Se ti hanno inviato un file env (via 1Password, Signal, ecc.):

```bash
cp /percorso/al/file-ricevuto .env.local
```

### Opzione C — Manuale

```bash
cp .env.example .env.local
```

Compila ogni campo seguendo i commenti in `.env.example`.

---

## 3. Verifica rapida

```bash
# Solo nomi variabili (senza stampare segreti)
grep -E '^[A-Z_]+=' .env.local | cut -d= -f1

# Chiavi essenziali
grep -q '^AUTH_SECRET=' .env.local && echo "AUTH_SECRET: ok" || echo "AUTH_SECRET: mancante"
grep -q '^NEXT_PUBLIC_SUPABASE_URL=' .env.local && echo "Supabase: ok" || echo "Supabase: mancante"
```

---

## 4. Avvio in locale

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

---

## 5. Login OAuth (locale + produzione)

### Variabili Vercel (obbligatorie)

```
AUTH_SECRET=...
AUTH_URL=https://webapp-bice-six-42.vercel.app
AUTH_TRUST_HOST=true
NEXT_PUBLIC_APP_URL=https://webapp-bice-six-42.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
```

### URI callback da registrare

| Provider | Locale | Produzione (Vercel) |
|----------|--------|---------------------|
| Google | `http://localhost:3000/api/auth/callback/google` | `https://webapp-bice-six-42.vercel.app/api/auth/callback/google` |
| Facebook | `http://localhost:3000/api/auth/callback/facebook` | `https://webapp-bice-six-42.vercel.app/api/auth/callback/facebook` |

### Facebook — errore «dominio non incluso»

In [Meta for Developers](https://developers.facebook.com/) → la tua app:

1. **Settings → Basic → App Domains:** `webapp-bice-six-42.vercel.app` (solo hostname, no `https://`)
2. **Settings → Basic → Site URL:** `https://webapp-bice-six-42.vercel.app`
3. **Facebook Login → Settings → Valid OAuth Redirect URIs:** URI callback produzione sopra
4. App in modalità **Live** (non solo Development) per utenti reali

### Google — login che si blocca

In [Google Cloud Console](https://console.cloud.google.com/) → Credentials → OAuth client:

1. **Authorized JavaScript origins:** `https://webapp-bice-six-42.vercel.app`
2. **Authorized redirect URIs:** URI callback produzione sopra
3. Verifica che `AUTH_URL` su Vercel corrisponda al dominio reale

---

## 6. Migration database (planner profile)

Le tabelle `planner_profiles` e `composer_drafts` richiedono la migration `006`.

**Serve `SUPABASE_DB_URL` in `.env.local`** (non è su Vercel — solo per script locali):

1. [Supabase Dashboard](https://supabase.com/dashboard) → progetto → **Settings → Database**
2. **Connection string → URI** (modalità *Session pooler* o *Direct*)
3. Sostituisci `[YOUR-PASSWORD]` con la password del database Postgres
4. Aggiungi in `.env.local`:
   ```
   SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@...
   ```

Poi:

```bash
npm run db:planner
npm run db:verify-planner
```

**Alternativa senza URI:** incolla il contenuto di `supabase/migrations/006_planner_profile.sql` nel **SQL Editor** di Supabase e clicca Run.

---

## 7. Comandi utili

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Server di sviluppo |
| `npm run build` | Build produzione |
| `npm test` | Test Vitest |
| `npm run db:planner` | Applica migration profilo viaggiatore |
| `npm run db:verify-planner` | Verifica tabelle planner su Supabase |
| `npx vercel env ls production` | Elenco variabili su Vercel (nomi) |
| `npx vercel env pull .env.local --environment=production` | Scarica env da Vercel |

---

## 8. Regole di sicurezza

- **Non** committare `.env.local` o file con segreti
- **Non** incollare API keys in issue, PR o chat
- Se una chiave viene esposta, rigenerala dalla dashboard del servizio
- `.env.local` è già in `.gitignore`

---

## 9. Invito Vercel (per il maintainer)

1. [vercel.com](https://vercel.com) → progetto **webapp**
2. **Settings → Members** → Invite
3. Ruolo consigliato: **Developer** (basta per `env pull` e deploy)

---

## Link utili

- **Live:** https://webapp-bice-six-42.vercel.app
- **Repo:** https://github.com/robuntitled/webapp
- **Supabase:** dashboard del progetto collegato in `.env.local`
- **Travelpayouts:** https://app.travelpayouts.com