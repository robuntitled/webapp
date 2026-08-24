'use client';

import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function ShareTripLink({
  url,
  title,
  message,
}: {
  url: string;
  title: string;
  message: string;
}) {
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiato');
    } catch {
      toast.error('Copia non riuscita');
    }
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`${message}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: message, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    void copyLink();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={shareWhatsApp}>
        WhatsApp
      </Button>
      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void nativeShare()}>
        <Share2 className="mr-1 h-3.5 w-3.5" />
        Invita amici
      </Button>
    </div>
  );
}
