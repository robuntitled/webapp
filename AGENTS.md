# AGENTS.md

## Cursor Cloud specific instructions

Single **Next.js 15** app (`nomadlink-app`, App Router + Turbopack) using Supabase, NextAuth (Auth.js v5), and many optional travel APIs. No monorepo. Standard commands live in `README.md` / `package.json` scripts.

Services & commands:
- Dev server: `npm run dev` (http://localhost:3000)
- Build/type-check: `npm run build` (this is the real quality gate — Next runs TypeScript checks here)
- Tests: `npm run test` (Vitest)
- Lint: `npm run lint` is **not usable** — ESLint is not configured, so `next lint` drops into an interactive setup prompt. There is no eslint config/dependency in the repo; rely on `npm run build` for type checks.

Non-obvious gotchas:
- **The app will not boot without env vars.** `lib/supabase-admin.ts` runs `requireSupabaseEnv()` at module load and throws if `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_KEY` are missing or malformed. That module is on the `middleware.ts` import chain (which matches every page), so a missing/invalid value makes **every route return HTTP 500** even though the dev server prints `✓ Ready`.
- Well-formed **dummy** values are enough to render static/fallback pages (the URL only needs to parse and not equal `[SENSITIVE]`; no live connection is opened until a query runs). Create `.env.local` (gitignored) to boot locally:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://dummy.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key
  SUPABASE_SERVICE_KEY=dummy-service-key
  AUTH_SECRET=dev-only-secret-not-for-production
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
  With dummy values, `/`, `/destinazioni` (Esplora/Crea wizard, static templates + seed fallbacks), `/itinerario/[slug]`, and static pages (`/privacy`, `/termini`, `/punti`) render at 200. Data helpers catch DB errors and return hardcoded fallbacks.
- **Real credentials** unlock more: a real **Supabase** project is required for auth (login/register) and any DB-backed feature (dashboard, trips persistence, chat, points, profiles). OAuth (Google/Facebook) and all travel APIs (LiteAPI, Viator, Duffel, GetTransfer, Omio, Google Maps, Stripe, Pexels, Resend, Upstash, AI Composer) are optional and degrade gracefully when unset. Provide real values via the Cursor Secrets panel (injected as env vars) or in `.env.local`. Full reference: `.env.example`.
- Test suite has **3 pre-existing failures** at this commit (`lib/composer/publish-validation.test.ts`, `lib/composer/trip-templates.test.ts`); 291 pass. Not caused by env setup.
