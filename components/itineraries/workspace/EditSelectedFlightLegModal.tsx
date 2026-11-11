'use client';

import { useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updatePracticeSelectedFlightPlanAction } from '@/actions/practices';
import { LegFlightStrip } from '@/components/itineraries/LegFlightStrip';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  applyOfferToSnapshotLeg,
  snapshotLegToTripLeg,
} from '@/lib/itineraries/selected-flight-display';
import type {
  SelectedFlightLegSnapshot,
  SelectedFlightPlanSnapshot,
} from '@/lib/itineraries/selected-flight-plan';
import type { TripFlightOfferSnapshot } from '@/lib/travel/trip-flight-legs';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceId: string;
  plan: SelectedFlightPlanSnapshot;
  legId: string | null;
  onSaved: (plan: SelectedFlightPlanSnapshot) => void;
};

export function EditSelectedFlightLegModal({
  open,
  onOpenChange,
  practiceId,
  plan,
  legId,
  onSaved,
}: Props) {
  const sourceLeg = useMemo(
    () => plan.legs.find((l) => l.id === legId) ?? null,
    [plan.legs, legId]
  );
  const [draftLeg, setDraftLeg] = useState<SelectedFlightLegSnapshot | null>(null);
  const [pending, startTransition] = useTransition();

  const active = draftLeg ?? sourceLeg;
  const tripLeg = useMemo(
    () => (active ? snapshotLegToTripLeg(active, plan.travelers) : null),
    [active, plan.travelers]
  );

  function handleOpen(next: boolean) {
    if (next && sourceLeg) setDraftLeg({ ...sourceLeg });
    if (!next) setDraftLeg(null);
    onOpenChange(next);
  }

  function onDateAndOffer(date: string, offer: TripFlightOfferSnapshot | null) {
    if (!active) return;
    setDraftLeg(applyOfferToSnapshotLeg(active, date, offer));
  }

  function save() {
    if (!active || !legId) return;
    const nextPlan: SelectedFlightPlanSnapshot = {
      ...plan,
      version: 2,
      priceMode: 'unit',
      savedAt: new Date().toISOString(),
      legs: plan.legs.map((l) => (l.id === legId ? active : l)),
    };
    startTransition(async () => {
      const res = await updatePracticeSelectedFlightPlanAction({
        practiceId,
        selectedFlightPlan: nextPlan,
      });
      if (res && 'error' in res) {
        toast.error(res.error);
        return;
      }
      onSaved(nextPlan);
      handleOpen(false);
      toast.message('Volo aggiornato');
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.25rem)] max-w-lg overflow-x-hidden overflow-y-auto rounded-2xl p-3 sm:p-5">
        <DialogHeader className="min-w-0 pr-6">
          <DialogTitle className="truncate font-display text-base sm:text-lg">
            Modifica volo
            {active ? ` · ${active.originIata} → ${active.destinationIata}` : ''}
          </DialogTitle>
        </DialogHeader>
        {tripLeg ? (
          <div className="min-w-0 space-y-4 overflow-x-hidden pt-1">
            <div className="min-w-0 overflow-x-hidden">
              <LegFlightStrip
                leg={tripLeg}
                adults={Math.max(1, plan.travelers)}
                minDate={null}
                onDateAndOffer={onDateAndOffer}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1 rounded-full"
                onClick={() => handleOpen(false)}
              >
                Annulla
              </Button>
              <Button
                type="button"
                className="min-h-11 flex-1 rounded-full"
                disabled={pending || !active?.offerId}
                onClick={save}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Salva tratta
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Tratta non trovata.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
