# Guida per collaboratori

## Flusso quotidiano

```bash
git pull origin main    # 1. Scarica le novità
# ... lavori sul codice ...
git add .
git commit -m "Descrizione chiara"
git pull origin main    # 2. Pull prima del push
git push origin main    # 3. Invia su GitHub
```

## Regole

- **Non committare** `.env.local` (contiene password e chiavi API)
- **Comunica** su quali file stai lavorando per evitare conflitti
- **Messaggi di commit** chiari (es. "Aggiunge filtro età nella dashboard")
- **Mai** `git push --force` su `main`

## Aree sensibili

Prima di modificare questi file, coordinati con l'altro collaboratore:

- `auth.ts` / `auth.config.ts` / `lib/auth-session.ts`
- `middleware.ts`
- `actions/*.ts`
- `lib/queries/trips.ts`

## Setup iniziale (prima volta)

```bash
git clone https://github.com/robuntitled/webapp.git
cd webapp
npm install
cp .env.example .env.local
# Compila .env.local con le tue credenziali
npm run dev
```

## Conflitti

Se Git segnala un conflitto:

1. Apri il file con i marcatori `<<<<<<<`
2. Scegli quale codice tenere (o unisci entrambi)
3. Rimuovi i marcatori
4. `git add . && git commit -m "Risolve conflitto"`