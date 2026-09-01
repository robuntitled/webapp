'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { mapAuthError } from '@/lib/auth/oauth-errors';
import { GoogleIcon, FacebookIcon } from './_components/SocialIcons';
import { ConsentCheckboxes } from '@/components/legal/ConsentCheckboxes';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Map, Plane, Users } from 'lucide-react';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import Link from 'next/link';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';

export default function LoginPage() {
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
  const router = useRouter();

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

  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    setError('');
    setOauthLoading(provider);
    try {
      await signIn(provider, {
        callbackUrl: `${window.location.origin}/onboarding`,
      });
    } catch {
      setError('Accesso non riuscito. Riprova tra poco.');
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (isRegisterMode) {
      if (!privacyAccepted || !termsAccepted) {
        setError('Devi accettare l\'informativa privacy e i termini di servizio.');
        setIsLoading(false);
        return;
      }

      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        setError('Completa la verifica anti-bot prima di registrarti.');
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

        const result = await signIn('credentials', { email, password, redirect: false });
        if (result?.ok) {
          router.push('/onboarding');
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
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        // Auth.js: code su CredentialsSignin (email non verificata)
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
          router.push('/onboarding');
        }
      } catch {
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

  const loginHighlights = [
    { Icon: Map, text: 'Scegli un itinerario ufficiale, non un pacchetto' },
    { Icon: Users, text: 'Parti da solo, con amici o su una partenza di gruppo' },
    { Icon: Plane, text: 'Ognuno prenota voli e hotel per conto proprio' },
  ] as const;

  return (
    <main className="relative min-h-screen">
      <HeroBackground images={BRAND_IMAGES.heroes.slideshow} overlay="photo" parallax />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-6 sm:py-16">
        <ScrollReveal variant="card" className="w-full max-w-[26.5rem] rounded-2xl border border-white/70 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)] sm:p-8 space-y-4 sm:space-y-5 text-foreground">
            <div className="flex flex-col items-center text-center">
              <BrandLogo size={42} priority />
              <h1 className="mt-3 font-display text-[1.35rem] font-semibold leading-snug tracking-tight text-slate-900 sm:mt-4 sm:text-[1.45rem]">
                Il tuo viaggio senza tour operator.
              </h1>
              {isRegisterMode ? (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Crea il tuo account. Due minuti, poi scegli un itinerario.
                </p>
              ) : null}
            </div>

            <ul className="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/90">
              {loginHighlights.map(({ Icon, text }, i) => (
                <li
                  key={text}
                  className={`flex items-start gap-3 px-3.5 py-2 text-left sm:py-2.5 ${
                    i > 0 ? 'border-t border-slate-200/80' : ''
                  }`}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-[13px] leading-snug text-slate-700">{text}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                disabled={oauthLoading !== null}
                onClick={() => void handleOAuthSignIn('google')}
              >
                <GoogleIcon className="w-4 h-4 mr-2" />
                {oauthLoading === 'google' ? 'Reindirizzamento…' : 'Continua con Google'}
              </Button>
              <Button
                className="w-full h-11 rounded-xl bg-[#1877F2] hover:bg-[#166eab] text-white"
                disabled={oauthLoading !== null}
                onClick={() => void handleOAuthSignIn('facebook')}
              >
                <FacebookIcon className="w-4 h-4 mr-2" />
                {oauthLoading === 'facebook' ? 'Reindirizzamento…' : 'Continua con Facebook'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-white px-3 text-muted-foreground">oppure email</span>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {isRegisterMode && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Nome</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Cognome</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  placeholder="nome@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isRegisterMode ? 8 : undefined}
                  className="h-11 rounded-xl"
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
                />
              )}

              {isRegisterMode && TURNSTILE_SITE_KEY && (
                <TurnstileWidget
                  key={turnstileKey}
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={setTurnstileToken}
                  onExpire={() => setTurnstileToken('')}
                  onError={() => setTurnstileToken('')}
                />
              )}

              {info && (
                <p className="text-sm text-center bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 rounded-lg py-2 px-3">
                  {info}
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive text-center bg-destructive/10 rounded-lg py-2 px-3">
                  {error}
                </p>
              )}

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
                className="w-full h-11 rounded-xl text-base font-medium"
              >
                {isLoading ? 'Un attimo…' : isRegisterMode ? 'Registrati' : 'Accedi'}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600">
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
                className="font-medium text-slate-900 underline underline-offset-2"
              >
                {isRegisterMode ? 'Accedi' : 'Registrati'}
              </button>
            </p>
            <p className="text-center text-[11px] text-slate-500">
              <Link href="/privacy" className="underline underline-offset-2">
                Privacy
              </Link>
              {' · '}
              <Link href="/termini" className="underline underline-offset-2">
                Termini
              </Link>
            </p>
          </ScrollReveal>
      </div>
    </main>
  );
}