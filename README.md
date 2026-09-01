# Flygetr

Piattaforma per trovare e creare viaggi di gruppo. Costruita con Next.js 15, Supabase e NextAuth.

## Setup locale

```bash
git clone https://github.com/robuntitled/webapp.git
cd webapp
npm install
cp .env.example .env.local
```

Compila `.env.local` con le credenziali reali (Supabase, OAuth, Pexels).

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Struttura progetto

```
app/           → pagine e routing (App Router)
actions/       → server actions (mutazioni DB)
components/    → UI riusabile
lib/           → query, validazioni, auth helpers, utils
types/         → tipi TypeScript condivisi
```

## Script

| Comando | Descrizione |
|---|---|
| `npm run dev` | Server di sviluppo |
| `npm run build` | Build di produzione |
| `npm run lint` | Lint |
| `npm run test` | Test unitari |

## Collaborazione Git

Vedi [CONTRIBUTING.md](./CONTRIBUTING.md) per il flusso di lavoro condiviso con il collaboratore.