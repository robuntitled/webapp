'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { acceptLegalConsent } from '@/actions/privacy';
import { ConsentCheckboxes } from '@/components/legal/ConsentCheckboxes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CompletaRegistrazioneForm() {
  const router = useRouter();
  const { update } = useSession();
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!privacyAccepted || !termsAccepted) {
      setError('Devi accettare l\'informativa privacy e i termini di servizio.');
      return;
    }

    setLoading(true);
    try {
      await acceptLegalConsent(marketingAccepted);
      await update({ privacyConsentAccepted: true });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Completa la registrazione</CardTitle>
        <CardDescription>
          Prima di continuare, leggi e accetta i documenti legali. Questo passaggio è richiesto dal
          GDPR per gli accessi tramite Google o Facebook.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <ConsentCheckboxes
            privacyAccepted={privacyAccepted}
            termsAccepted={termsAccepted}
            marketingAccepted={marketingAccepted}
            onPrivacyChange={setPrivacyAccepted}
            onTermsChange={setTermsAccepted}
            onMarketingChange={setMarketingAccepted}
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvataggio...' : 'Continua'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}