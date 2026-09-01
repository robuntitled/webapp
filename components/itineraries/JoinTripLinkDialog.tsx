'use client';

import { useState, useTransition } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { resolveTripLinkAction } from '@/actions/trip-link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function JoinTripLinkDialog({
  triggerLabel = 'Hai un link?',
}: {
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await resolveTripLinkAction(value);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setValue('');
      router.push(result.href);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setValue('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:border-primary/40 hover:text-primary"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inserisci link viaggio</DialogTitle>
          <DialogDescription>
            Incolla il link che ti hanno inviato. Ti portiamo direttamente al viaggio.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://…/partenze/… oppure /invito/…"
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'trip-link-error' : undefined}
          />
          {error ? (
            <p id="trip-link-error" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" className="rounded-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Apri il viaggio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
