'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { resolveBookingReconciliationAction } from '@/actions/booking-reconciliation';
import { Button } from '@/components/ui/button';

export function ResolveReconciliationButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  function submit() {
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error('Inserisci una nota.');
      return;
    }
    start(async () => {
      const result = await resolveBookingReconciliationAction({ id, note: trimmed });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Segnato come risolto.');
      setOpen(false);
      setNote('');
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2 h-8 rounded-full text-xs"
        onClick={() => setOpen(true)}
      >
        Segna risolto
      </Button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <label className="block font-sans text-[11px] font-medium text-amber-950">
        Nota (obbligatoria)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-2 py-1.5 font-sans text-xs text-foreground"
          placeholder="Es. rimborso inviato / booking recuperato"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-full text-xs"
          disabled={pending}
          onClick={submit}
        >
          Conferma
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full text-xs"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Annulla
        </Button>
      </div>
    </div>
  );
}
