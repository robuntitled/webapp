'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

type NextDayCtaProps = {
  hasNextDay: boolean;
  onNext: () => void;
};

export function NextDayCta({ hasNextDay, onNext }: NextDayCtaProps) {
  return (
    <Button
      type="button"
      onClick={onNext}
      disabled={!hasNextDay}
      className="h-11 w-full rounded-2xl bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40"
    >
      {hasNextDay ? (
        <>
          Passa al Giorno Successivo
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      ) : (
        'Ultimo giorno del viaggio'
      )}
    </Button>
  );
}
