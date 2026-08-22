'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFavoriteItinerary } from '@/actions/favorites';
import { cn } from '@/lib/utils';

export function PlanSaveButton({
  templateId,
  initialSaved,
  isLoggedIn,
}: {
  templateId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onToggle = () => {
    if (!isLoggedIn) {
      toast.error('Accedi per salvare l’itinerario.');
      router.push(`/?callbackUrl=/destinazioni`);
      return;
    }
    startTransition(async () => {
      const result = await toggleFavoriteItinerary(templateId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setSaved(result.saved);
      toast.message(result.saved ? 'Salvato nei viaggi che ti interessano' : 'Rimosso dai salvati');
    });
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? 'Togli dai salvati' : 'Salva itinerario'}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition sm:h-12 sm:w-12',
        saved
          ? 'border-accent bg-accent text-white shadow-md shadow-accent/30'
          : 'border-border bg-white text-accent hover:border-accent hover:bg-accent/10'
      )}
    >
      {pending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Heart className={cn('h-5 w-5', saved && 'fill-current')} />
      )}
    </button>
  );
}
