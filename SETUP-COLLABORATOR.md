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

## 5. Login OAuth in locale

Se Google/Facebook non funzionano in dev, il maintainer deve aggiungere nelle console OAuth:

| Provider | URI callback |
|----------|----------------|
| Google | `http://localhost:3000/api/auth/callback/google` |
| Facebook | `http://localhost:3000/api/auth/callback/facebook` |

---

## 6. Comandi utili

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Server di sviluppo |
| `npm run build` | Build produzione |
| `npm test` | Test Vitest |
| `npx vercel env ls production` | Elenco variabili su Vercel (nomi) |
| `npx vercel env pull .env.local --environment=production` | Scarica env da Vercel |

---

## 7. Regole di sicurezza

- **Non** committare `.env.local` o file con segreti
- **Non** incollare API keys in issue, PR o chat
- Se una chiave viene esposta, rigenerala dalla dashboard del servizio
- `.env.local` è già in `.gitignore`

---

## 8. Invito Vercel (per il maintainer)

1. [vercel.com](https://vercel.com) → progetto **webapp**
2. **Settings → Members** → Invite
3. Ruolo consigliato: **Developer** (basta per `env pull` e deploy)

---

## Link utili

- **Live:** https://webapp-bice-six-42.vercel.app
- **Repo:** https://github.com/robuntitled/webapp
- **Supabase:** dashboard del progetto collegato in `.env.local`
- **Travelpayouts:** https://app.travelpayouts.com