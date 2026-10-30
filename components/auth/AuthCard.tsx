'use client';

import { useEffect, useState } from 'react';
import { getSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { Map, Plane, Users } from 'lucide-react';
import { mapAuthError } from '@/lib/auth/oauth-errors';
import { safeCallbackUrl } from '@/lib/auth/callback-url';
import { GoogleIcon, FacebookIcon } from '@/app/_components/SocialIcons';
import { ConsentCheckboxes } from '@/components/legal/ConsentCheckboxes';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { TRAVEL_HERO_IMAGES } from '@/lib/brand/travel-heroes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';

const HIGHLIGHTS = [
  { Icon: Map, text: 'Scegli un itinerario ufficiale, non un pacchetto' },
  { Icon: Users, text: 'Parti da solo, con amici o in gruppo' },
  { Icon: Plane, text: 'Ognuno prenota voli e hotel per conto proprio' },
] as const;

export function AuthCard() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [postAuthPath, setPostAuthPath] = useState('/onboarding');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('error');
    if (authError) {
      setError(mapAuthError(authError));
      if (authError === 'Configuration') {
        void fetch('/api/auth/status')
          .then((r) => r.json())
          .then((data: { missing?: string[] }) => {
            if (data.missing?.length) {
              setError(
                `Configurazione OAuth incompleta su Vercel. Mancano: ${data.missing.join(', ')}`
              );
            }
          })
          .catch(() => undefined);
      }
    }

    const callback = safeCallbackUrl(
      params.get('callbackUrl'),
      window.location.origin,
      '/onboarding'
    );
    setPostAuthPath(callback);

    if (params.get('mode') === 'register') {
      setIsRegisterMode(true);
    }

    const verify = params.get('verify');
    const ref = params.get('ref');
    if (ref && /^[0-9a-f-]{36}$/i.test(ref)) {
      try {
        localStorage.setItem('nl_ref', ref);
      } catch {
        /* ignore */
      }
    }
    if (verify === 'ok') {
      setInfo('Email confermata. Ora puoi accedere con email e password.');
      setIsRegisterMode(false);
      const verifiedEmail = params.get('email');
      if (verifiedEmail) setEmail(verifiedEmail);
    } else if (verify === 'error') {
      setError(params.get('reason') || 'Verifica email non riuscita. Richiedi un nuovo link.');
    } else if (verify === 'rate_limit') {
      setError('Troppi tentativi di verifica. Riprova tra un minuto.');
    }
  }, []);

  /** Solo path relativi: evita redirect cross-host quando AUTH_URL è di produzione. */
  const relativeCallback = () =>
    postAuthPath.startsWith('/') ? postAuthPath : '/onboarding';

  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    setError('');
    setOauthLoading(provider);
    try {
      await signIn(provider, {
        callbackUrl: relativeCallback(),
      });
    } catch {
      setError('Accesso non riuscito. Riprova tra poco.');
      setOauthLoading(null);
    }
  };

  const goAfterAuth = () => {
    const path = relativeCallback();
    // Hard navigation relativa: non seguire mai result.url assoluti di Auth.js
    window.location.assign(path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (isRegisterMode) {
      if (!firstName.trim()) {
        setError('Inserisci il nome.');
        setIsLoading(false);
        return;
      }
      if (!lastName.trim()) {
        setError('Inserisci il cognome.');
        setIsLoading(false);
        return;
      }
      if (!email.trim()) {
        setError('Inserisci l’email.');
        setIsLoading(false);
        return;
      }
      if (password.length < 8) {
        setError('La password deve avere almeno 8 caratteri.');
        setIsLoading(false);
        return;
      }
      if (!privacyAccepted || !termsAccepted) {
        setError("Devi accettare l'informativa privacy e i termini di servizio.");
        setIsLoading(false);
        return;
      }

      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        setError(
          'Verifica anti-bot non disponibile o non completata. Riprova tra poco o aggiorna la pagina.'
        );
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            privacyConsent: true,
            termsAccepted: true,
            marketingConsent: marketingAccepted,
            turnstileToken: turnstileToken || undefined,
            referredBy: localStorage.getItem('nl_ref') || undefined,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          setTurnstileToken('');
          setTurnstileKey((k) => k + 1);
          throw new Error(errorText || 'Qualcosa è andato storto');
        }

        const data = (await response.json()) as {
          requiresVerification?: boolean;
          message?: string;
          email?: string;
          devVerifyUrl?: string;
        };

        if (data.requiresVerification) {
          setPendingVerifyEmail(data.email || email);
          setInfo(
            data.message ||
              'Controlla la tua email e apri il link di conferma per attivare l’account.'
          );
          if (data.devVerifyUrl && process.env.NODE_ENV === 'development') {
            console.info('[dev] verify url:', data.devVerifyUrl);
          }
          setIsRegisterMode(false);
          return;
        }

        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
          callbackUrl: relativeCallback(),
        });
        if (result?.ok) {
          goAfterAuth();
        } else {
          setError('Registrazione riuscita. Prova ad accedere dopo aver verificato l’email.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Errore imprevisto');
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        if (!email.trim()) {
          setError('Inserisci l’email.');
          setIsLoading(false);
          return;
        }
        if (!password) {
          setError('Inserisci la password.');
          setIsLoading(false);
          return;
        }

        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
          callbackUrl: relativeCallback(),
        });

        const code =
          (result as { code?: string } | undefined)?.code ||
          (typeof result?.error === 'string' && result.error.includes('email_not_verified')
            ? 'email_not_verified'
            : undefined);

        if (code === 'email_not_verified') {
          setPendingVerifyEmail(email);
          setError(
            'Email non ancora confermata. Controlla la casella di posta o reinvia il link.'
          );
        } else if (result?.error) {
          setError('Email o password non validi. Riprova.');
        } else if (result?.ok) {
          goAfterAuth();
        }
      } catch {
        // next-auth/react fa `new URL(data.url)`: URL relativi da AUTH_URL rewrite
        // potevano far fallire un login riuscito. Se la sessione c’è, prosegui comunque.
        try {
          const session = await getSession();
          if (session?.user) {
            goAfterAuth();
            return;
          }
        } catch {
          /* ignore */
        }
        setError('Si è verificato un errore inaspettato.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResendVerification = async () => {
    const target = (pendingVerifyEmail || email).trim();
    if (!target) {
      setError('Inserisci l’email per ricevere il link di conferma.');
      return;
    }
    setResendLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setError(data.error || 'Impossibile reinviare. Riprova più tardi.');
        return;
      }
      setInfo(data.message || 'Se l’account esiste, riceverai un’email a breve.');
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="relative min-h-dvh">
      <HeroBackground
        images={TRAVEL_HERO_IMAGES}
        overlay="photo"
        parallax
        forceCover
      />

      <div className="relative z-10 flex min-h-dvh items-start justify-center px-4 py-6 sm:py-10">
        <ScrollReveal
          variant="card"
          className="relative mb-[max(1.5rem,var(--cookie-banner-pad,0px))] mt-2 flex w-full max-w-[29.7rem] flex-col rounded-[1.35rem] border border-white/80 bg-white/95 p-5 shadow-[0_32px_64px_-24px_rgba(15,23,42,0.45)] backdrop-blur-sm sm:mt-[min(8vh,4rem)] sm:p-7 space-y-3.5 sm:space-y-4 text-foreground"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-teal-500 to-accent"
            aria-hidden
          />

          <div className="flex flex-col items-center text-center">
            <Link href="/" aria-label="Flygetr — home">
              <BrandLogo size={42} priority />
            </Link>
            <h1 className="mt-3 font-display text-[1.375rem] font-semibold leading-[1.2] tracking-[-0.02em] text-slate-900 sm:text-[1.45rem]">
              Il tuo viaggio senza tour operator.
            </h1>
            {isRegisterMode ? (
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">
                Crea il tuo account in due minuti.
              </p>
            ) : null}
          </div>

          <ul className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/70 divide-y divide-slate-200/70">
            {HIGHLIGHTS.map(({ Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-2.5 px-3 py-2 text-left sm:px-3.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="text-[12.5px] font-medium leading-tight text-slate-700">
                  {text}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="h-11 w-full rounded-xl border-slate-200 bg-white font-medium shadow-sm hover:bg-slate-50"
              disabled={oauthLoading !== null}
              onClick={() => void handleOAuthSignIn('google')}
            >
              <GoogleIcon className="w-4 h-4 mr-2" />
              {oauthLoading === 'google' ? 'Reindirizzamento…' : 'Continua con Google'}
            </Button>
            <Button
              className="h-11 w-full rounded-xl bg-[#1877F2] font-medium text-white shadow-sm hover:bg-[#166eab]"
              disabled={oauthLoading !== null}
              onClick={() => void handleOAuthSignIn('facebook')}
            >
              <FacebookIcon className="w-4 h-4 mr-2" />
              {oauthLoading === 'facebook' ? 'Reindirizzamento…' : 'Continua con Facebook'}
            </Button>
          </div>

          <div className="relative py-0.5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-[0.14em]">
              <span className="bg-white px-3 text-slate-400">oppure email</span>
            </div>
          </div>

          <form
            className={cn('space-y-3', isRegisterMode && 'space-y-2.5')}
            onSubmit={handleSubmit}
            noValidate
          >
            {isRegisterMode && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="firstName" className="text-xs">
                    Nome
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName" className="text-xs">
                    Cognome
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-10 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="email" className={isRegisterMode ? 'text-xs' : undefined}>
                Email
              </Label>
              <Input
                type="email"
                id="email"
                placeholder="nome@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cn(
                  'rounded-xl border-slate-200 bg-slate-50/60',
                  isRegisterMode ? 'h-10' : 'h-11'
                )}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className={isRegisterMode ? 'text-xs' : undefined}>
                Password
              </Label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isRegisterMode ? 8 : undefined}
                className={cn(
                  'rounded-xl border-slate-200 bg-slate-50/60',
                  isRegisterMode ? 'h-10' : 'h-11'
                )}
              />
            </div>

            {isRegisterMode && (
              <ConsentCheckboxes
                privacyAccepted={privacyAccepted}
                termsAccepted={termsAccepted}
                marketingAccepted={marketingAccepted}
                onPrivacyChange={setPrivacyAccepted}
                onTermsChange={setTermsAccepted}
                onMarketingChange={setMarketingAccepted}
                compact
              />
            )}

            {isRegisterMode && TURNSTILE_SITE_KEY && (
              <div className="space-y-2">
                <TurnstileWidget
                  key={turnstileKey}
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={(token) => {
                    setTurnstileToken(token);
                    setError('');
                  }}
                  onExpire={() => setTurnstileToken('')}
                  onError={() => {
                    setTurnstileToken('');
                    setError(
                      'Verifica anti-bot non riuscita (dominio non autorizzato o rete). Tocca Riprova oppure chiedi di aggiungere questo host in Cloudflare Turnstile.'
                    );
                  }}
                />
                <button
                  type="button"
                  className="mx-auto flex min-h-11 items-center justify-center text-sm font-medium text-slate-700 underline underline-offset-2"
                  onClick={() => {
                    setTurnstileToken('');
                    setTurnstileKey((k) => k + 1);
                    setError('');
                  }}
                >
                  Riprova verifica anti-bot
                </button>
              </div>
            )}

            {/* Slot fisso: evita che la card salti quando compare il banner errore/info */}
            <div
              className="min-h-[2.75rem]"
              aria-live="polite"
              aria-atomic="true"
            >
              {info ? (
                <p className="text-sm text-center bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 rounded-lg py-2 px-3">
                  {info}
                </p>
              ) : null}
              {error ? (
                <p className="text-sm text-destructive text-center bg-destructive/10 rounded-lg py-2 px-3">
                  {error}
                </p>
              ) : null}
            </div>

            {(pendingVerifyEmail || error.includes('non ancora confermata')) && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 rounded-xl text-sm"
                disabled={resendLoading}
                onClick={() => void handleResendVerification()}
              >
                {resendLoading ? 'Invio…' : 'Reinvia email di conferma'}
              </Button>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-xl text-base font-semibold shadow-[0_10px_24px_-12px_rgba(249,115,22,0.65)]"
            >
              {isLoading ? 'Un attimo…' : isRegisterMode ? 'Registrati' : 'Accedi'}
            </Button>
          </form>

          <p className="pb-1 text-center text-sm text-slate-600">
            {isRegisterMode ? 'Hai già un account?' : 'Non hai un account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError('');
                setInfo('');
                setTurnstileToken('');
                setTurnstileKey((k) => k + 1);
              }}
              className="inline-flex min-h-11 items-center font-medium text-slate-900 underline underline-offset-2"
            >
              {isRegisterMode ? 'Accedi' : 'Registrati'}
            </button>
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pb-2 text-center text-sm text-slate-500">
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center underline underline-offset-2"
            >
              Privacy
            </Link>
            <Link
              href="/termini"
              className="inline-flex min-h-11 items-center underline underline-offset-2"
            >
              Termini
            </Link>
          </p>
        </ScrollReveal>
      </div>
    </main>
  );
}
