'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FlightSearchPanel } from '@/components/travel/FlightSearchPanel';
import { parseSearchReturnReason } from '@/lib/travel/search-return';

function FlightSearchFallback() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-10 text-center text-sm text-slate-600">
      Caricamento ricerca voli…
    </div>
  );
}

function PrenotaFlightsInner() {
  const searchParams = useSearchParams();
  const returnReason = parseSearchReturnReason(searchParams.get('reason'));
  return (
    <FlightSearchPanel
      defaultAdults={1}
      cacheKey="flights"
      returnReason={returnReason}
    />
  );
}

export function PrenotaFlightsClient() {
  return (
    <Suspense fallback={<FlightSearchFallback />}>
      <PrenotaFlightsInner />
    </Suspense>
  );
}
