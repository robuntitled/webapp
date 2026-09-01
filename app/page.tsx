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

  return (
    <main className="relative min-h-screen">
      <HeroBackground images={BRAND_IMAGES.heroes.slideshow} overlay="photo" parallax />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="mb-8 flex w-full max-w-lg flex-col items-center text-center">
          <ScrollReveal variant="decor">
            <BrandLogo size={48} priority />
          </ScrollReveal>
          <ScrollReveal variant="title">
            <h1 className="mt-5 max-w-md font-display text-[clamp(1.85rem,1.4rem+1.6vw,2.75rem)] font-semibold leading-[1.12] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]">
              Il viaggio senza tour operator.
            </h1>
          </ScrollReveal>
          <ul className="mt-6 flex w-full max-w-md flex-col gap-2.5 text-left text-sm text-white/95 sm:mt-7">
            {[
              { Icon: Map, text: 'Scegli un itinerario ufficiale, non un pacchetto' },
              { Icon: Users, text: 'Parti da solo, con amici o su una partenza di gruppo' },
              { Icon: Plane, text: 'Ognuno prenota voli e hotel per conto proprio' },
            ].map(({ Icon, text }, i) => (
              <ScrollReveal key={text} variant="card" stagger={i + 1} as="li">
                <div className="flex items-start gap-3 rounded-xl bg-white/8 px-3.5 py-2.5 ring-1 ring-white/12 backdrop-blur-[2px]">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white" />
                  <span className="leading-snug">{text}</span>
                </div>
              </ScrollReveal>
            ))}
          </ul>
        </div>

        <ScrollReveal variant="card" className="w-full max-w-md rounded-[10px] border border-border bg-card p-7 space-y-5 text-foreground">
            <div>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                {isRegisterMode ? 'Crea il tuo account' : 'Entra in Flygetr'}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {isRegisterMode
                  ? 'Due minuti. Poi scegli un itinerario o una partenza di gruppo.'
                  : 'Accedi e scegli un itinerario ufficiale.'}
              </p>
            </div>

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
                <span className="bg-transparent px-3 text-muted-foreground">oppure email</span>
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