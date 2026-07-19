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
};

export function PhoneVerificationSection({
  phoneMasked,
  phoneVerified: initialVerified,
}: PhoneVerificationSectionProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'idle' | 'code'>('idle');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [verified, setVerified] = useState(initialVerified);
  const [masked, setMasked] = useState(phoneMasked);

  const sendCode = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/auth/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { error?: string; message?: string; mode?: string };
      if (!res.ok) {
        toast.error(data.error || 'Invio non riuscito');
        return;
      }
      toast.success(data.message || 'Codice inviato');
      setStep('code');
      if (data.mode === 'dev') {
        toast.message('Modalità dev: codice nei log del server');
      } else if (data.mode === 'whatsapp') {
        toast.message('Controlla WhatsApp sul cellulare indicato');
      }
    } catch {
      toast.error('Errore di rete');
    } finally {
      setSending(false);
    }
  };

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
      setMasked(data.phoneMasked ?? masked);
      setStep('idle');
      setCode('');
      setPhone('');
    } catch {
      toast.error('Errore di rete');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <SettingsSection
      icon={Phone}
      title="Telefono e badge"
      description="Obbligatorio per creare un viaggio o unirti a uno. Ricevi il codice su WhatsApp (o SMS se configurato). Badge visibile agli altri — non vedono il numero."
    >
      <div className="space-y-5">
        {verified ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-200">
              <ShieldCheck className="h-5 w-5" />
              <p className="font-semibold">Numero verificato</p>
            </div>
            {masked && (
              <p className="text-sm text-white/70">
                Associato a <span className="font-mono text-white/90">{masked}</span>
              </p>
            )}
            <VerifiedBadges phoneVerified emailVerified={false} size="md" />
            <p className="text-xs text-white/45">
              Gli altri vedono solo il badge, non il tuo numero.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setVerified(false);
                setStep('idle');
              }}
            >
              Cambia numero
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-verify">Cellulare</Label>
              <Input
                id="phone-verify"
                type="tel"
                inputMode="tel"
                placeholder="+39 333 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={settingsFieldClass}
                disabled={step === 'code' && sending}
              />
              <p className="text-xs text-muted-foreground">
                Formato internazionale consigliato. Default Italia (+39).
              </p>
            </div>

            {step === 'code' && (
              <div className="space-y-2">
                <Label htmlFor="phone-otp">Codice da WhatsApp</Label>
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
            )}

            <div className="flex flex-wrap gap-2">
              {step === 'idle' ? (
                <Button
                  type="button"
                  className="rounded-full"
                  disabled={sending || phone.trim().length < 6}
                  onClick={() => void sendCode()}
                >
                  {sending ? 'Invio…' : 'Invia codice SMS'}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    className="rounded-full"
                    disabled={confirming || code.trim().length < 4}
                    onClick={() => void confirmCode()}
                  >
                    {confirming ? 'Verifica…' : 'Conferma codice'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    disabled={sending}
                    onClick={() => void sendCode()}
                  >
                    Reinvia SMS
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => {
                      setStep('idle');
                      setCode('');
                    }}
                  >
                    Annulla
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
