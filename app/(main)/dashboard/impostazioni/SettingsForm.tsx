'use client';

import { useState } from 'react';
import { changeUserPassword, updateUserSettings } from '@/actions/user';
import { GdprRightsCard } from '@/components/settings/GdprRightsCard';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { UserSettings } from '@/types/user';

export default function SettingsForm({
  userSettings,
  privacyEmail,
}: {
  userSettings: UserSettings | null;
  privacyEmail: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(
    userSettings?.marketing_consent ?? false
  );
  const canChangePassword = userSettings?.canChangePassword ?? false;

  const handleSettingsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await updateUserSettings(marketingConsent);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore imprevisto');
    }
    setIsSubmitting(false);
  };

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

  return (
    <div className="grid gap-8">
      <form onSubmit={handleSettingsSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Comunicazioni</CardTitle>
            <CardDescription>
              Gestisci le email promozionali. Puoi revocare il consenso in qualsiasi momento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="marketing_consent" className="flex flex-col space-y-1">
                <span>Email di marketing</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Novità su viaggi, articoli e promozioni NomadLink.
                </span>
              </Label>
              <Switch
                id="marketing_consent"
                checked={marketingConsent}
                onCheckedChange={setMarketingConsent}
              />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvo...' : 'Salva preferenze'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Account e Sicurezza</CardTitle>
          <CardDescription>Gestisci le credenziali del tuo account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Email: {userSettings?.email}</p>
            <Button variant="outline" disabled>
              Modifica Email
            </Button>
          </div>

          {canChangePassword ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 border-t pt-6">
              <h3 className="font-semibold">Cambia password</h3>
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Password attuale</Label>
                <Input id="oldPassword" name="oldPassword" type="password" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nuova password</Label>
                <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma nuova password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'Aggiorno...' : 'Cambia Password'}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-slate-500 border-t pt-6">
              Hai effettuato l&apos;accesso con Google o Facebook. La password non è gestita da
              NomadLink.
            </p>
          )}
        </CardContent>
      </Card>

      <GdprRightsCard privacyEmail={privacyEmail} />
    </div>
  );
}