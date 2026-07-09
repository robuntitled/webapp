'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, MessageCircle, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';

type TripInviteCardProps = {
  tripId: string;
  tripTitle: string;
};

export function TripInviteCard({ tripId, tripTitle }: TripInviteCardProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/viaggi/${tripId}`
      : `https://webapp-bice-six-42.vercel.app/viaggi/${tripId}`;

  const inviteMessage = `Ehi! 🌴 Sto organizzando "${tripTitle}" su NomadLink. Entra in modalità relax — zero Excel, zero caos WhatsApp. Ci stai? ${shareUrl}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copiato! Mandalo ai tuoi amici svogliati 😎');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossibile copiare il link');
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="rounded-2xl border-0 shadow-md bg-gradient-to-br from-accent/10 to-primary/5">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <PartyPopper className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-lg font-semibold">Chiama gli amici (modalità relax)</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Mandagli il link: si iscrivono come spettatori, vedono prezzi e piani — senza dover
              pianificare nulla.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => void copyLink()}>
            <Copy className="mr-2 h-4 w-4" />
            {copied ? 'Copiato!' : 'Copia link invito'}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={shareWhatsApp}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Invia su WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}