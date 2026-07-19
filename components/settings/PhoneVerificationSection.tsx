'use client';

import { useState } from 'react';
import { Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SettingsSection,
  settingsFieldClass,
} from '@/components/settings/SettingsSection';
import { VerifiedBadges } from '@/components/profile/VerifiedBadges';
import { toast } from 'sonner';

type PhoneVerificationSectionProps = {
  phoneMasked: string | null;
  phoneVerified: boolean;
  /** Un OTP è già stato inviato (in attesa di codice) */
  otpPending?: boolean;
};

/**
 * Solo stato + inserimento codice se già inviato.
 * L’invio OTP avviene solo da create/join viaggio (PhoneVerifyGate).
 */
export function PhoneVerificationSection({
  phoneMasked,
  phoneVerified: initialVerified,
  otpPending = false,
}: PhoneVerificationSectionProps) {
  const [code, setCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [verified, setVerified] = useState(initialVerified);
  const [masked, setMasked] = useState(phoneMasked);
  const [pending, setPending] = useState(otpPending && !initialVerified);

  const confirmCode = async () => {
    setConfirming(true);
    try {
      const res = await fetch('/api/auth/phone/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        phoneMasked?: string;
      };
      if (!res.ok) {
        toast.error(data.error || 'Codice non valido');
        return;
      }
      toast.success(data.message || 'Numero verificato');
      setVerified(true);
      setPending(false);
      setMasked(data.phoneMasked ?? masked);
      setCode('');
    } catch {
      toast.error('Errore di rete');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <SettingsSection
      icon={Phone}
      title="Verifica telefono"
      description="Spunta blu “Verificato” solo con cellulare. Codice WhatsApp quando crei o ti unisci a un viaggio (24 ore; di norma un invio, secondo solo se scaduto senza tentativi)."
    >
      <div className="space-y-5">
        {verified ? (
          <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sky-100">
              <ShieldCheck className="h-5 w-5" />
              <p className="font-semibold">Account con spunta blu</p>
            </div>
            {masked && (
              <p className="text-sm text-white/70">
                Numero <span className="font-mono text-white/90">{masked}</span>
              </p>
            )}
            <VerifiedBadges phoneVerified size="md" />
            <p className="text-xs text-white/45">
              Gli altri vedono solo il badge, non il tuo numero. La registrazione email non dà questa
              spunta.
            </p>
          </div>
        ) : pending ? (
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              Ti abbiamo inviato un codice WhatsApp (valido 24 ore). Inseriscilo qui. Un secondo
              invio solo se scade senza tentativi di codice.
            </p>
            {masked && (
              <p className="text-xs text-muted-foreground font-mono">Inviato a {masked}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone-otp">Codice</Label>
              <Input
                id="phone-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={settingsFieldClass}
                maxLength={8}
              />
            </div>
            <Button
              type="button"
              className="rounded-full"
              disabled={confirming || code.trim().length < 4}
              onClick={() => void confirmCode()}
            >
              {confirming ? 'Verifica…' : 'Conferma codice'}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Non hai ancora la spunta blu. Quando proverai a{' '}
              <strong className="text-foreground">creare</strong> o{' '}
              <strong className="text-foreground">unirti</strong> a un viaggio, ti chiederemo il
              cellulare e invieremo un codice WhatsApp (valido 24 ore).
            </p>
            <p className="text-xs text-muted-foreground">
              Navigare e comporre bozze non richiede verifica.
            </p>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
