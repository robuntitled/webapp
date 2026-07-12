'use client';

import type { TravelSetupStatus } from '@/lib/travelpayouts/setup-hints';
import { AlertTriangle, ExternalLink } from 'lucide-react';

type TravelAffiliateSetupBannerProps = {
  setup: TravelSetupStatus | null | undefined;
  compact?: boolean;
};

export function TravelAffiliateSetupBanner({ setup, compact = false }: TravelAffiliateSetupBannerProps) {
  if (!setup?.hints.length) return null;

  const showPrograms = setup.hasMarker && !setup.usingDemoMarker;

  return (
    <div
      className={`rounded-xl border border-amber-400/25 bg-amber-500/10 ${
        compact ? 'p-3 space-y-2' : 'p-4 space-y-3'
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="space-y-2 min-w-0">
          <p className={`font-medium text-amber-100 ${compact ? 'text-xs' : 'text-sm'}`}>
            Affiliate Travelpayouts da configurare
          </p>
          <ul className={`text-amber-100/80 space-y-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {setup.hints.map((hint) => (
              <li key={hint}>• {hint}</li>
            ))}
          </ul>

          {showPrograms && (
            <div className={`flex flex-wrap gap-2 pt-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {setup.programsRequired.map((program) => (
                <a
                  key={program.id}
                  href={program.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-500/10 px-2.5 py-1 text-amber-100 hover:bg-amber-500/20"
                >
                  Iscriviti a {program.name} ({program.purpose})
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}