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
      className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-110 disabled:opacity-40"
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
