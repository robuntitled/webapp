'use client';

import { useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { changeUserPassword } from '@/actions/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SettingsSection,
  settingsFieldClass,
} from '@/components/settings/SettingsSection';
import { PhoneVerificationSection } from '@/components/settings/PhoneVerificationSection';
import { maskPhoneE164 } from '@/lib/phone/normalize';
import { toast } from 'sonner';
import type { UserSettings } from '@/types/user';

export function SettingsSecuritySection({
  userSettings,
}: {
  userSettings: UserSettings | null;
}) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const canChangePassword = userSettings?.canChangePassword ?? false;

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsChangingPassword(true);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await changeUserPassword(formData);
      toast.success(result.message);
      event.currentTarget.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore imprevisto');
    }
    setIsChangingPassword(false);
  };

  const phoneVerified = Boolean(userSettings?.phone_verified_at);
  const phoneMasked =
    phoneVerified && userSettings?.phone_e164
      ? maskPhoneE164(userSettings.phone_e164)
      : null;

  return (
    <div className="space-y-10">
      <PhoneVerificationSection
        phoneMasked={phoneMasked}
        phoneVerified={phoneVerified}
      />

      <SettingsSection
        icon={Mail}
        title="Email di accesso"
        description="L'indirizzo associato al tuo account NomadLink."
      >
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Indirizzo attuale
            </p>
            <p className="font-medium text-foreground truncate">{userSettings?.email}</p>
          </div>
          <Button variant="outline" disabled className="rounded-full shrink-0">
            Modifica email
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={KeyRound}
        title="Password"
        description={
          canChangePassword
            ? 'Aggiorna la password del tuo account NomadLink.'
            : 'Accesso tramite provider esterno — la password non è gestita da NomadLink.'
        }
      >
        {canChangePassword ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="oldPassword">Password attuale</Label>
                <Input
                  id="oldPassword"
                  name="oldPassword"
                  type="password"
                  required
                  className={settingsFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nuova password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={8}
                  className={settingsFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma nuova password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  className={settingsFieldClass}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-border/50">
              <Button type="submit" disabled={isChangingPassword} className="rounded-full px-8">
                {isChangingPassword ? 'Aggiorno...' : 'Cambia password'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground leading-relaxed">
            Hai effettuato l&apos;accesso con Google o Facebook. Per modificare le credenziali usa
            le impostazioni del provider collegato.
          </div>
        )}
      </SettingsSection>
    </div>
  );
}