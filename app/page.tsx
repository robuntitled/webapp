'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Mail, KeyRound, ArrowRight, User } from 'lucide-react';
import { GoogleIcon, FacebookIcon } from './_components/SocialIcons';
import { signIn } from "next-auth/react";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (isRegisterMode) {
      // --- Logica di REGISTRAZIONE ---
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, password }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Qualcosa è andato storto');
        }

        const result = await signIn('credentials', { email, password, redirect: false });
        if (result?.ok) {
            router.push('/dashboard');
        } else {
            setError('Registrazione riuscita. Prova ad accedere.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      // --- Logica di LOGIN ---
      try {
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError('Email o password non validi. Riprova.');
        } else if (result?.ok) {
          router.push('/dashboard');
        }
      } catch (err) {
        setError('Si è verificato un errore inaspettato.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <main className="relative flex items-center justify-center min-h-screen">
      <Image
        src="/images/login-background.jpg"
        alt="Sfondo di un paesaggio di viaggio"
        fill
        style={{objectFit:"cover"}}
        className="-z-10"
        quality={90}
      />
      
      <div className="z-10 w-full max-w-md p-8 space-y-6 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm rounded-2xl shadow-2xl">
          <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">NomadLink</h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">{isRegisterMode ? 'Crea il tuo account per iniziare' : 'Il tuo prossimo viaggio di gruppo inizia qui.'}</p>
          </div>

          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => signIn('google', { redirectTo: '/dashboard' })}>
              <GoogleIcon className="w-4 h-4 mr-2" />
              Continua con Google
            </Button>
            <Button className="w-full bg-[#1877F2] text-white hover:bg-[#166eab]" onClick={() => signIn('facebook', { redirectTo: '/dashboard' })}>
              <FacebookIcon className="w-4 h-4 mr-2" />
              Continua con Facebook
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white/90 dark:bg-slate-950/90 text-slate-500 backdrop-blur-sm">oppure</span></div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
              {isRegisterMode && (
                  <>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="firstName" className="text-slate-800 dark:text-slate-200">Nome</Label>
                        <Input type="text" id="firstName" placeholder="Il tuo nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="lastName" className="text-slate-800 dark:text-slate-200">Cognome</Label>
                        <Input type="text" id="lastName" placeholder="Il tuo cognome" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                  </>
              )}
              <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="email" className="text-slate-800 dark:text-slate-200">Email</Label>
                  <Input type="email" id="email" placeholder="nome@esempio.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="password" className="text-slate-800 dark:text-slate-200">Password</Label>
                  <Input type="password" id="password" placeholder="La tua password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              
              <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Caricamento...' : (isRegisterMode ? 'Registrati' : 'Accedi')}
              </Button>
          </form>

          <div className="text-center text-sm">
              <Button variant="link" onClick={() => setIsRegisterMode(!isRegisterMode)}>
                  {isRegisterMode ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
              </Button>
          </div>
      </div>
    </main>
  );
}