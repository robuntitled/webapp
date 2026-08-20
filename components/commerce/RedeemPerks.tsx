'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PERKS, formatPoints, type Perk } from '@/lib/commerce/points';
import { redeemNomadPerk } from '@/actions/points';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function RedeemPerks({ balance }: { balance: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tripId, setTripId] = useState('');

  const redeem = (perk: Perk) => {
    start(async () => {
      const result = await redeemNomadPerk({
        perkId: perk.id,
        tripId: perk.requiresTrip ? tripId || undefined : undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Perk riscattato');
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="ID Trip (per i boost)"
        value={tripId}
        onChange={(e) => setTripId(e.target.value.trim())}
        className="border-white/20 bg-white/10 text-white"
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {PERKS.map((perk) => {
          const affordable = balance >= perk.cost;
          return (
            <li key={perk.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden>
                  {perk.emoji}
                </span>
                <span className="tabular-nums text-sm font-semibold text-accent">
                  {formatPoints(perk.cost)} pt
                </span>
              </div>
              <p className="mt-2 font-medium">{perk.label}</p>
              <p className="mt-1 text-sm text-white/70">{perk.description}</p>
              <Button
                type="button"
                size="sm"
                className="mt-3 rounded-full"
                disabled={!affordable || pending}
                onClick={() => redeem(perk)}
              >
                {affordable ? 'Riscatta' : 'Punti insufficienti'}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
