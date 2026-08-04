'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createPost } from '@/actions/posts';
import { cn } from '@/lib/utils';

type CreatePostComposerProps = {
  placeholder?: string;
  compact?: boolean;
  /** Glass scuro per bacheca / profilo su hero */
  tone?: 'default' | 'onDark';
};

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
  const [pending, startTransition] = useTransition();
  const onDark = tone === 'onDark';

  const onPickFile = async (f: File | null) => {
    if (!f) return;
    try {
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
    } catch {
      toast.error('Errore durante la compressione della foto.');
    }
  };

  const clearImage = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const publish = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('body', body);
      if (file) fd.set('image', file);
      const res = await createPost(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Post pubblicato');
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
