'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createPost } from '@/actions/posts';

type CreatePostComposerProps = {
  placeholder?: string;
  compact?: boolean;
};

export function CreatePostComposer({
  placeholder = 'Racconta un viaggio, un posto, un momento…',
  compact = false,
}: CreatePostComposerProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  const onPickFile = async (f: File | null) => {
    if (!f) return;
    try {
      const compressed = await imageCompression(f, {
        maxSizeMB: 1.2,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
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
      className={
        compact
          ? 'space-y-3 rounded-2xl border border-border/60 bg-card p-4'
          : 'space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm'
      }
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        maxLength={2000}
        rows={compact ? 3 : 4}
        className="resize-none rounded-xl border-border/50 bg-background/50"
      />

      {preview ? (
        <div className="relative overflow-hidden rounded-xl border border-border/50">
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
            className="rounded-full"
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
          className="rounded-full"
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
