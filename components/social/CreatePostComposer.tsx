'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import { ImagePlus, Loader2, MapPin, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PlaceSearchInput } from '@/components/composer/plan/PlaceSearchInput';
import { createPost } from '@/actions/posts';
import { cn } from '@/lib/utils';

type PhotoGeo = {
  lat: number;
  lng: number;
  label?: string;
  source: 'exif' | 'place';
};

type CreatePostComposerProps = {
  placeholder?: string;
  compact?: boolean;
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
    /* no GPS */
  }
  return null;
}

async function compressForUpload(file: File): Promise<File> {
  if (file.size <= 350_000 && file.type !== 'image/png') {
    return file;
  }
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.55,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    initialQuality: 0.72,
    fileType: 'image/webp',
  });
  return compressed;
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
  const [compressing, setCompressing] = useState(false);
  const [geo, setGeo] = useState<PhotoGeo | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [pending, startTransition] = useTransition();
  const onDark = tone === 'onDark';

  const onPickFile = async (f: File | null) => {
    if (!f) return;

    // Anteprima immediata (niente attesa compressione)
    const quickUrl = URL.createObjectURL(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return quickUrl;
    });
    setFile(f);
    setCompressing(true);
    setShowPlaceSearch(false);
    setPlaceQuery('');

    const fromExif = await readExifGps(f);
    setGeo(fromExif);
    if (fromExif) {
      toast.success('Posizione dello scatto letta dalla foto.');
    }

    try {
      const compressed = await compressForUpload(f);
      if (compressed.size > 4.5 * 1024 * 1024) {
        toast.error('Foto ancora troppo grande. Prova un’altra immagine.');
        clearImage();
        return;
      }
      setFile(compressed);
      const nextUrl = URL.createObjectURL(compressed);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
    } catch {
      toast.error('Errore durante l’ottimizzazione della foto.');
    } finally {
      setCompressing(false);
    }
  };

  const clearImage = () => {
    setFile(null);
    setGeo(null);
    setPlaceQuery('');
    setShowPlaceSearch(false);
    setCompressing(false);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const publish = () => {
    if (compressing) {
      toast.message('Attendi un attimo: sto ottimizzando la foto…');
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set('body', body);
      if (file) fd.set('image', file);
      if (file && geo) {
        fd.set('lat', String(geo.lat));
        fd.set('lng', String(geo.lng));
        if (geo.label) fd.set('locationLabel', geo.label);
      }
      const res = await createPost(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        geo && file ? 'Post pubblicato (foto georeferenziata)' : 'Post pubblicato'
      );
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
            <img
              src={preview}
              alt=""
              className="max-h-72 w-full object-cover"
              decoding="async"
            />
            {compressing ? (
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-black/55 px-3 py-1.5 text-[11px] text-white/85">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Ottimizzazione foto…
              </div>
            ) : null}
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/75"
              aria-label="Rimuovi foto"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {geo ? (
              <div
                className={cn(
                  'flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2 text-xs',
                  onDark ? 'bg-white/5 text-white/85' : 'bg-muted text-foreground'
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate">
                  {geo.label
                    ? geo.label
                    : geo.source === 'exif'
                      ? 'Posizione dallo scatto (EXIF)'
                      : 'Luogo selezionato'}
                </span>
                <button
                  type="button"
                  className="text-[11px] font-medium text-accent hover:underline"
                  onClick={() => setShowPlaceSearch(true)}
                >
                  Correggi
                </button>
                <button
                  type="button"
                  className="opacity-70 hover:opacity-100"
                  onClick={() => {
                    setGeo(null);
                    setPlaceQuery('');
                    setShowPlaceSearch(false);
                  }}
                  aria-label="Rimuovi posizione foto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setShowPlaceSearch(true)}
                className={cn(
                  'h-8 rounded-full text-xs',
                  onDark &&
                    'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white'
                )}
              >
                <MapPin className="mr-1.5 h-3.5 w-3.5" />
                Dove è stata scattata?
              </Button>
            )}

            {showPlaceSearch || (geo && !geo.label && geo.source === 'exif') ? (
              <div className="space-y-1">
                <PlaceSearchInput
                  value={placeQuery}
                  placeholder="Cerca città o luogo dello scatto…"
                  className={cn(
                    'h-10 rounded-xl pl-9 text-sm',
                    onDark
                      ? 'border-white/15 bg-white/5 text-white placeholder:text-white/35'
                      : ''
                  )}
                  onChange={(label, coords) => {
                    setPlaceQuery(label);
                    if (coords) {
                      setGeo({
                        lat: coords.lat,
                        lng: coords.lng,
                        label,
                        source: 'place',
                      });
                      setShowPlaceSearch(false);
                      toast.success('Luogo dello scatto impostato.');
                    }
                  }}
                />
                <p className="px-1 text-[10px] text-white/40">
                  Usa il GPS della foto se presente, oppure cerca il posto reale dello
                  scatto (non la tua posizione attuale).
                </p>
              </div>
            ) : null}
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
          disabled={pending || compressing || (!body.trim() && !file)}
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
