'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { joinEditionAction } from '@/actions/practices';
import { Button } from '@/components/ui/button';
import { DASHBOARD_VIAGGI_COPY } from '@/lib/itineraries/dashboard-viaggi-copy';

export function JoinEditionButton({ editionId }: { editionId: string }) {
  const [pending, startTransition] = useTransition();
  // Kr #8: mai preselezionata.
  const [ageConfirmed18, setAgeConfirmed18] = useState(false);

  return (
    <div className="space-y-3" data-testid="join-edition-age-gate">
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-border bg-white px-3.5 py-3 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-primary"
          checked={ageConfirmed18}
          onChange={(e) => setAgeConfirmed18(e.target.checked)}
          data-testid="join-age-18"
        />
        <span>{DASHBOARD_VIAGGI_COPY.invite.ageLabel}</span>
      </label>
      <Button
        className="min-h-11 w-full rounded-full sm:w-auto"
        disabled={pending || !ageConfirmed18}
        onClick={() => {
          if (!ageConfirmed18) {
            toast.error(DASHBOARD_VIAGGI_COPY.invite.ageRequired);
            return;
          }
          startTransition(async () => {
            const result = await joinEditionAction(editionId, { ageConfirmed18: true });
            if (result?.error) toast.error(result.error);
          });
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Partecipa
      </Button>
    </div>
  );
}
