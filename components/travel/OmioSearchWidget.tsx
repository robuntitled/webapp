'use client';

import { useEffect, useId, useState } from 'react';
import { AlertCircle, Bus, ExternalLink, TrainFront } from 'lucide-react';
import {
  getOmioPartnerId,
  getOmioRedirectUrl,
  isOmioWidgetConfigured,
  omioTravelModeAttr,
  type OmioTransportMode,
} from '@/lib/omio/config';
import { loadOmioNemoBundle } from '@/lib/omio/widget-loader';
import './omio-nemo-shell.css';

const MODE_COPY: Record<
  OmioTransportMode,
  { label: string; icon: typeof Bus; searchHint: string }
> = {
  bus: {
    label: 'Bus',
    icon: Bus,
    searchHint: 'Autobus e pullman in Europa',
  },
  train: {
    label: 'Treni',
    icon: TrainFront,
    searchHint: 'Biglietti ferroviari in Europa',
  },
};

type OmioSearchWidgetProps = {
  mode: OmioTransportMode;
};

function OmioWidgetSkeleton() {
  return (
    <div className="space-y-3 py-1" aria-hidden>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-12 animate-pulse rounded-xl bg-muted/60" />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <div className="h-12 animate-pulse rounded-xl bg-muted/50" />
        <div className="h-12 animate-pulse rounded-xl bg-muted/50" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-primary/15 sm:w-32" />
      </div>
    </div>
  );
}

export function OmioSearchWidget({ mode }: OmioSearchWidgetProps) {
  const reactId = useId().replace(/:/g, '');
  const mountKey = `omio-nemo-${mode}-${reactId}`;
  const copy = MODE_COPY[mode];
  const Icon = copy.icon;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const configured = isOmioWidgetConfigured();
  const partnerId = getOmioPartnerId();
  const redirect = getOmioRedirectUrl();
  const travelMode = omioTravelModeAttr(mode);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadOmioNemoBundle()
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Impossibile caricare il widget Omio'
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [configured, attempt, mountKey]);

  return (
    <div className="space-y-3">
      <div className="overflow-visible rounded-2xl border border-border/60 bg-gradient-to-br from-[oklch(0.22_0.05_220)] via-primary to-[oklch(0.5_0.1_200)] p-px shadow-lg shadow-primary/10">
        {/* overflow-visible: il datepicker Omio non deve essere clipato */}
        <div className="overflow-visible rounded-[0.95rem] bg-card">
          <div className="flex items-center gap-2.5 border-b border-border/40 px-4 py-2.5 sm:px-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold tracking-tight text-foreground">
                NomadLink · {copy.label}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {copy.searchHint}
              </p>
            </div>
          </div>

          <div className="overflow-visible px-3 py-3 pb-8 sm:px-4 sm:py-4 sm:pb-10">
            {!configured ? (
              <OmioSetupBanner />
            ) : (
              <div className="relative min-h-[220px] overflow-visible">
                {loading ? (
                  <div className="absolute inset-0 z-10 flex flex-col justify-center rounded-xl bg-card/90 px-1 backdrop-blur-[2px]">
                    <OmioWidgetSkeleton />
                  </div>
                ) : null}
                <div
                  key={mountKey}
                  className="omio-nemo-shell relative z-20 min-h-[220px] w-full overflow-visible [&_iframe]:w-full [&_iframe]:max-w-full"
                >
                  <div
                    data-omio-widget="true"
                    data-partner-id={partnerId}
                    data-default-travel-mode={travelMode}
                    data-new-tab="true"
                    data-redirect={redirect}
                    data-layout="fluid"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}
          </div>

          {configured ? (
            <div className="border-t border-border/30 px-4 py-2 sm:px-5">
              <p className="text-[10px] leading-relaxed text-muted-foreground/75">
                Ricerca su NomadLink · checkout su{' '}
                <span className="text-muted-foreground">Omio</span>
                <ExternalLink className="ml-0.5 inline h-2.5 w-2.5 align-text-bottom opacity-60" />
                {' · '}
                partner Impact
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="space-y-2">
              <p className="font-medium text-foreground">Widget Omio non caricato</p>
              <p className="text-muted-foreground">{error}</p>
              <button
                type="button"
                className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                onClick={() => setAttempt((n) => n + 1)}
              >
                Riprova
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OmioSetupBanner() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-2">
          <p className="font-medium text-foreground">Widget Omio non configurato</p>
          <p className="text-muted-foreground">
            Imposta{' '}
            <code className="text-xs">NEXT_PUBLIC_OMIO_PARTNER_ID</code> e{' '}
            <code className="text-xs">NEXT_PUBLIC_OMIO_REDIRECT_URL</code> (codice Impact /
            Search Widget).
          </p>
        </div>
      </div>
    </div>
  );
}
