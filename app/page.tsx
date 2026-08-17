'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { mapAuthError } from '@/lib/auth/oauth-errors';
import { GoogleIcon, FacebookIcon } from './_components/SocialIcons';
import { ConsentCheckboxes } from '@/components/legal/ConsentCheckboxes';
import { HeroBackground } from '@/components/brand/HeroBackground';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { BRAND_IMAGES } from '@/lib/brand/images';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Map, Plane, Users } from 'lucide-react';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';

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
      <HeroBackground images={BRAND_IMAGES.heroes.slideshow} overlay="gradient" parallax />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Brand panel — visibile su desktop */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-end p-12 pb-20">
          <ScrollReveal variant="decor">
            <div className="mb-6 flex items-center gap-3">
              <Image src="/assets/logo.png" alt="" width={48} height={48} className="rounded-xl" />
              <span className="font-display text-3xl font-semibold text-white">NomadLink</span>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="title">
            <h1 className="max-w-lg font-display text-5xl font-semibold leading-[1.1] text-white xl:text-6xl">
              Viaggia insieme. Organizza meglio.
            </h1>
          </ScrollReveal>
          <ScrollReveal variant="title" stagger={1}>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/75">
              Scopri viaggi di gruppo, crea itinerari con l’AI e prenota i voli nello stesso posto.
            </p>
          </ScrollReveal>
          <ul className="mt-10 max-w-md space-y-3 text-sm text-white/70">
            {[
              { Icon: Users, text: 'Unisciti a crew aperte o invita i tuoi amici' },
              { Icon: Map, text: 'Componi il giorno per giorno su mappa con l’AI' },
              { Icon: Plane, text: 'Prenota i voli; hotel e luoghi a supporto del viaggio' },
            ].map(({ Icon, text }, i) => (
              <ScrollReveal key={text} variant="card" stagger={i + 2} as="li">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/90" />
                  <span>{text}</span>
                </div>
              </ScrollReveal>
            ))}
          </ul>
        </div>

        {/* Form panel */}
        <div className="flex flex-1 items-center justify-center px-4 py-16 lg:py-12">
          <ScrollReveal variant="card" className="w-full max-w-md glass-panel rounded-3xl p-8 space-y-6">
            <div className="text-center lg:text-left">
              <ScrollReveal variant="decor">
                <div className="mb-4 flex items-center justify-center gap-2 lg:hidden">
                  <Image src="/assets/logo.png" alt="" width={32} height={32} className="rounded-lg" />
                  <span className="font-display text-2xl font-semibold">NomadLink</span>
                </div>
              </ScrollReveal>
              <ScrollReveal variant="title" stagger={1}>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground lg:hidden">
                  Viaggi di gruppo, itinerari AI e prenotazione voli — in un solo posto.
                </p>
              </ScrollReveal>
              <ScrollReveal variant="title">
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {isRegisterMode ? 'Crea il tuo account' : 'Entra in NomadLink'}
                </h2>
              </ScrollReveal>
              <ScrollReveal variant="card" stagger={1}>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {isRegisterMode
                    ? 'Inizia a organizzare o unirti a un viaggio'
                    : 'Accedi per scoprire, creare e prenotare'}
                </p>
              </ScrollReveal>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl bg-background/80"
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
                {isLoading ? 'Caricamento...' : isRegisterMode ? 'Registrati' : 'Accedi'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
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
                className="font-medium text-primary hover:underline"
              >
                {isRegisterMode ? 'Accedi' : 'Registrati'}
              </button>
            </p>
          </ScrollReveal>
        </div>
      </div>
    </main>
  );
}