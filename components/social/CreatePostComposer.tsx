'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import { ImagePlus, Loader2, MapPin, Navigation, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createPost } from '@/actions/posts';
import { cn } from '@/lib/utils';

type PhotoGeo = { lat: number; lng: number; source: 'exif' | 'gps' };

type CreatePostComposerProps = {
  placeholder?: string;
  compact?: boolean;
  /** Glass scuro per bacheca / profilo su hero */
  tone?: 'default' | 'onDark';
};

async function readExifGps(file: File): Promise<PhotoGeo | null> {
  try {
    const gps = await exifr.gps(file);
    if (
      gps &&
      typeof gps.latitude === 'number' &&
      typeof gps.longitude === 'number' &&
      Number.isFinite(gps.latitude) &&
      Number.isFinite(gps.longitude)
    ) {
      return { lat: gps.latitude, lng: gps.longitude, source: 'exif' };
    }
  } catch {
    /* no GPS in file */
  }
  return null;
}

export function CreatePostComposer({
  placeholder = 'Racconta un viaggio, un posto, un momento…',
  compact = false,
  tone = 'default',
}: CreatePostComposerProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [geo, setGeo] = useState<PhotoGeo | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const onDark = tone === 'onDark';

  const onPickFile = async (f: File | null) => {
    if (!f) return;
    try {
      const fromExif = await readExifGps(f);
      const compressed = await imageCompression(f, {
        maxSizeMB: 0.9,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        initialQuality: 0.82,
      });
      if (compressed.size > 4.5 * 1024 * 1024) {
        toast.error('Foto ancora troppo grande dopo la compressione. Prova un’altra immagine.');
        return;
      }
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
      setGeo(fromExif);
      if (fromExif) {
        toast.success('Posizione letta dalla foto (EXIF).');
      }
    } catch {
      toast.error('Errore durante la compressione della foto.');
    }
  };

  const clearImage = () => {
    setFile(null);
    setGeo(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalizzazione non supportata.');
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'gps',
        });
        setGeoBusy(false);
        toast.success('Posizione attuale aggiunta alla foto.');
      },
      () => {
        setGeoBusy(false);
        toast.error('Impossibile rilevare la posizione.');
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 }
    );
  };

  const publish = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('body', body);
      if (file) fd.set('image', file);
      if (file && geo) {
        fd.set('lat', String(geo.lat));
        fd.set('lng', String(geo.lng));
      }
      const res = await createPost(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(geo && file ? 'Post pubblicato sulla mappa foto' : 'Post pubblicato');
      setBody('');
      clearImage();
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        'space-y-3 rounded-3xl p-4 sm:p-5',
        onDark
          ? 'nl-feed-composer'
          : 'border border-border/60 bg-card shadow-sm',
        compact && 'p-4'
      )}
    >
      {onDark ? (
        <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Nuovo post
        </div>
      ) : null}

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        maxLength={2000}
        rows={compact ? 3 : 4}
        className={cn(
          'resize-none rounded-2xl',
          onDark
            ? 'border-white/10 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-accent/40'
            : 'border-border/50 bg-background/50'
        )}
      />

      {preview ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-2xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="max-h-72 w-full object-cover" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/75"
              aria-label="Rimuovi foto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {geo ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
                  onDark
                    ? 'bg-accent/20 text-accent'
                    : 'bg-accent/10 text-foreground'
                )}
              >
                <MapPin className="h-3 w-3" />
                {geo.source === 'exif' ? 'GPS dalla foto' : 'Posizione attuale'}
                <button
                  type="button"
                  className="ml-0.5 opacity-70 hover:opacity-100"
                  onClick={() => setGeo(null)}
                  aria-label="Rimuovi posizione"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={geoBusy || pending}
                onClick={useCurrentLocation}
                className={cn(
                  'h-8 rounded-full text-xs',
                  onDark &&
                    'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white'
                )}
              >
                <Navigation className="mr-1.5 h-3.5 w-3.5" />
                {geoBusy ? 'Rilevo…' : 'Tagga sulla mappa'}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'rounded-full',
              onDark &&
                'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white'
            )}
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="mr-1.5 h-4 w-4" />
            Foto
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          className="rounded-full px-5"
          disabled={pending || (!body.trim() && !file)}
          onClick={publish}
        >
          {pending ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Pubblico…
            </>
          ) : (
            'Pubblica'
          )}
        </Button>
      </div>
    </div>
  );
}
