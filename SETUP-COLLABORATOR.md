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

### Opzione A — Da Vercel (consigliata **solo se le env non sono “Sensitive”**)

```bash
npx vercel login
npx vercel link
# Seleziona team + progetto "webapp"

npx vercel env pull .env.local --environment=production
```

Questo crea `.env.local` con gli stessi valori di produzione **solo se le variabili sono di tipo encrypted/plain**.

> ⚠️ Su questo progetto le env di **Production/Preview sono `sensitive`**: Vercel **non le esporta** più.  
> `vercel env pull` scrive il placeholder letterale `[SENSITIVE]` e l’app fallisce con `Invalid URL` su Supabase.  
> In quel caso usa **Opzione B** (file dal maintainer) oppure **Opzione C** e copia da:
> - Supabase → Project Settings → API → Project URL, `anon` key, `service_role` key  
> - Provider OAuth / AI / Maps come da sezioni sotto  
>
> Per lo sviluppo locale conviene anche avere le stesse chiavi sul target **Development** in Vercel  
> (tipo encrypted, non sensitive), così `npx vercel env pull` torna a funzionare.

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

### Facebook — checklist completa (login web)

In [Meta for Developers](https://developers.facebook.com/) → la tua app:

#### A. Domini e redirect (obbligatorio)

1. **Settings → Basic → App Domains:** `webapp-bice-six-42.vercel.app` (solo hostname, no `https://`)
2. **Settings → Basic → Site URL** (se presente) / **Website** platform: `https://webapp-bice-six-42.vercel.app`
3. Aggiungi il prodotto **Facebook Login** se non c’è: **Add Product → Facebook Login → Web**
4. **Facebook Login → Settings:**
   - **Client OAuth Login:** Sì  
   - **Web OAuth Login:** Sì  
   - **Valid OAuth Redirect URIs** (uno per riga, esatti):
     - `https://webapp-bice-six-42.vercel.app/api/auth/callback/facebook`
     - `http://localhost:3000/api/auth/callback/facebook` (solo per test locale)
5. **Privacy Policy URL** e **User data deletion** (Settings → Basic) — Meta li richiede spesso in Live

#### B. Errore `Invalid Scopes: email` (il tuo caso)

Meta non concede `email` finché non è abilitato nel **Use case** dell’app (anche se lo chiede Auth.js).

1. Vai su **Use cases** (o **Casi d’uso**)
2. Apri **Authentication and account creation** / **Autenticazione e creazione account** → **Customize**
3. Nella sezione permessi / dati utente, aggiungi esplicitamente:
   - `email`
   - `public_profile`
4. Salva e riprova il login (svuota cache o usa finestra anonima)

Se non trovi Use cases: **App Review → Permissions and Features** e verifica che `email` e `public_profile` siano **Ready for testing** / Standard Access.

#### C. Modalità app e tester

- In **Development**: solo ruoli dell’app (Admin / Developer / Tester) o Test Users possono fare login.
- Per utenti reali: passa l’app a **Live** (toggle in alto) dopo aver completato Privacy Policy e permessi standard.
- Se vedi «Questo contenuto non è disponibile al momento» insieme a Invalid Scopes, di solito manca il punto **B** (permessi Use case), non Vercel.

#### D. Credenziali su Vercel

In Vercel → Project **webapp** → Settings → Environment Variables (Production):

| Nome | Valore |
|------|--------|
| `FACEBOOK_CLIENT_ID` | App ID Meta |
| `FACEBOOK_CLIENT_SECRET` | App Secret Meta |
| `AUTH_URL` | `https://webapp-bice-six-42.vercel.app` (senza slash finale) |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_SECRET` | già presente se Google funziona |

Dopo ogni modifica env o Meta: **Redeploy** su Vercel non è obbligatorio per i soli settings Meta, ma sì se cambi env.

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