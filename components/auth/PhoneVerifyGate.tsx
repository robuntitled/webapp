'use client';

import { useState } from 'react';
import { Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type PhoneVerifyGateProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chiamato dopo verifica ok — ripeti create/join/publish */
  onVerified: () => void;
};

/**
 * Modal: un solo OTP WhatsApp quando l’utente crea o si unisce a un viaggio.
 */
export function PhoneVerifyGate({ open, onOpenChange, onVerified }: PhoneVerifyGateProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const sendCode = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/auth/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'trip_action' }),
      });
      const data = (await res.json()) as { error?: string; message?: string; mode?: string };
      if (!res.ok) {
        toast.error(data.error || 'Invio non riuscito');
        // Se già inviato una volta, passa a inserimento codice
        if (data.error?.toLowerCase().includes('già ricevuto')) {
          setStep('code');
        }
        return;
      }
      toast.success(data.message || 'Codice inviato su WhatsApp');
      if (data.mode === 'dev') {
        toast.message('Dev: codice nei log server');
      }
      setStep('code');
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
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        toast.error(data.error || 'Codice non valido');
        return;
      }
      toast.success(data.message || 'Telefono verificato ✓');
      onOpenChange(false);
      setPhone('');
      setCode('');
      setStep('phone');
      onVerified();
    } catch {
      toast.error('Errore di rete');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-white/10 bg-[#0b1120] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Verifica telefono
          </DialogTitle>
          <DialogDescription className="text-white/55 text-left">
            Per creare un viaggio o unirti serve un numero verificato. Ricevi{' '}
            <strong className="text-white/80">un solo codice WhatsApp</strong>, valido{' '}
            <strong className="text-white/80">24 ore</strong> — non potremo reinviarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {step === 'phone' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="gate-phone" className="text-white/70">
                  Cellulare (con WhatsApp)
                </Label>
                <Input
                  id="gate-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+39 333 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 rounded-xl border-white/15 bg-white/5 text-white"
                />
              </div>
              <Button
                type="button"
                className="w-full rounded-full"
                disabled={sending || phone.trim().length < 6}
                onClick={() => void sendCode()}
              >
                <Phone className="mr-2 h-4 w-4" />
                {sending ? 'Invio…' : 'Ricevi l’unico codice WhatsApp'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="gate-otp" className="text-white/70">
                  Codice (24 ore, un solo invio)
                </Label>
                <Input
                  id="gate-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-11 rounded-xl border-white/15 bg-white/5 text-white"
                  maxLength={8}
                />
                <p className="text-[11px] text-white/40">
                  Controlla WhatsApp. Non c’è reinvio: evita di chiudere la chat.
                </p>
              </div>
              <Button
                type="button"
                className="w-full rounded-full"
                disabled={confirming || code.trim().length < 4}
                onClick={() => void confirmCode()}
              >
                {confirming ? 'Verifica…' : 'Conferma e continua'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Rileva errori di gate telefono da server action / API */
export function isPhoneGateError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('telefono') ||
    m.includes('phone_verify') ||
    m.includes('verificare il telefono') ||
    m.includes('phone_verify_required')
  );
}
