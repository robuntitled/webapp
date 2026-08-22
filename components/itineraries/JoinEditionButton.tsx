'use client';

import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { joinEditionAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';

export function JoinEditionButton({ editionId }: { editionId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await joinEditionAction(editionId);
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Unisciti · interessato
    </Button>
  );
}
