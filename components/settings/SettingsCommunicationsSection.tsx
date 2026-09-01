'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { updateUserSettings } from '@/actions/user';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { toast } from 'sonner';
import type { UserSettings } from '@/types/user';

export function SettingsCommunicationsSection({
  userSettings,
}: {
  userSettings: UserSettings | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(
    userSettings?.marketing_consent ?? false
  );

  const handleSubmit = async (event: React.FormEvent) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <SettingsSection
        icon={Mail}
        title="Email di marketing"
        description="Novità su viaggi, articoli e promozioni Flygetr. Puoi revocare il consenso in qualsiasi momento."
      >
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 flex items-center justify-between gap-4">
          <Label htmlFor="marketing_consent" className="flex flex-col space-y-1 cursor-pointer">
            <span className="font-medium text-foreground">Ricevi aggiornamenti promozionali</span>
            <span className="font-normal leading-snug text-muted-foreground text-sm">
              Ti scriviamo solo se hai attivato questa opzione — niente spam.
            </span>
          </Label>
          <Switch
            id="marketing_consent"
            checked={marketingConsent}
            onCheckedChange={setMarketingConsent}
          />
        </div>
      </SettingsSection>

      <div className="flex justify-end pt-2 border-t border-border/50">
        <Button type="submit" disabled={isSubmitting} className="rounded-full px-8">
          {isSubmitting ? 'Salvo...' : 'Salva preferenze'}
        </Button>
      </div>
    </form>
  );
}