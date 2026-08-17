'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { searchPexelsImages } from '@/actions/images';
import { Button } from '@/components/ui/button';
import { ImageIcon, Loader2, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PexelsImage = {
  id: number;
  description: string;
  urls: { small: string; regular: string };
};

export function TripCoverPicker({
  destination,
  value,
  onChange,
  className,
}: {
  destination: string;
  value?: string;
  onChange: (url: string) => void;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PexelsImage[]>([]);
  const [page, setPage] = useState(1);

  const search = async (nextPage = page) => {
    const query = destination.trim();
    if (!query) {
      toast.error('Inserisci prima la destinazione.');
      return;
    }
    setLoading(true);
    try {
      const photos = await searchPexelsImages(`${query} travel`, nextPage);
      if (photos.length === 0 && nextPage > 1) {
        toast.info('Fine delle foto. Riparto dalla prima pagina.');
        setPage(1);
        setResults([]);
      } else {
        setResults(photos);
        setPage(nextPage + 1);
      }
    } catch {
      toast.error('Impossibile caricare le foto. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setResults([]);
  }, [destination]);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Copertina del viaggio</p>
          <p className="text-xs text-white/70">Foto in base a “{destination || 'destinazione'}”.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={loading || !destination.trim()}
          onClick={() => void search()}
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : results.length > 0 ? (
            <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
          )}
          {results.length > 0 ? 'Altre foto' : 'Scegli foto'}
        </Button>
      </div>

      {value ? (
        <div className="relative h-40 overflow-hidden rounded-2xl">
          <Image src={value} alt="Copertina scelta" fill className="object-cover" sizes="640px" />
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {results.map((img) => (
            <button
              type="button"
              key={img.id}
              onClick={() => onChange(img.urls.regular)}
              className={cn(
                'relative aspect-video overflow-hidden rounded-lg ring-2 transition',
                value === img.urls.regular
                  ? 'ring-white'
                  : 'ring-transparent hover:ring-white/50'
              )}
            >
              <Image src={img.urls.small} alt={img.description} fill className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
