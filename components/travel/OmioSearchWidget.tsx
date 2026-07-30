'use client';

import { useEffect, useId, useState } from 'react';
import { AlertCircle, Bus, ExternalLink, Loader2, TrainFront } from 'lucide-react';
import {
  buildOmioIframeSrc,
  getOmioWidgetIframeSrc,
  isOmioWidgetConfigured,
  type OmioTransportMode,
} from '@/lib/omio/config';
import { mountOmioSearchWidget } from '@/lib/omio/widget-loader';
import { cn } from '@/lib/utils';

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

export function OmioSearchWidget({ mode }: OmioSearchWidgetProps) {
  const reactId = useId().replace(/:/g, '');
  const containerId = `omio-search-${mode}-${reactId}`;
  const copy = MODE_COPY[mode];
  const Icon = copy.icon;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const configured = isOmioWidgetConfigured();
  const iframeSrc = getOmioWidgetIframeSrc() ? buildOmioIframeSrc(mode) : null;
  const useIframe = Boolean(iframeSrc);

  useEffect(() => {
    if (!configured || useIframe) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';

    void (async () => {
      try {
        await mountOmioSearchWidget(containerId, mode);
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Impossibile caricare il widget Omio'
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, containerId, mode, useIframe, attempt]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="border-b border-border/50 bg-muted/30 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-foreground">
                Ricerca {copy.label.toLowerCase()}
              </p>
              <p className="text-[11px] text-muted-foreground">{copy.searchHint}</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {!configured ? (
            <OmioSetupBanner mode={mode} />
          ) : useIframe && iframeSrc ? (
            <div className="relative min-h-[420px] overflow-hidden rounded-xl border border-border/50 bg-background">
              <iframe
                title={`Ricerca ${copy.label} Omio`}
                src={iframeSrc}
                className="h-[520px] w-full border-0"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <div className="relative min-h-[420px]">
              {loading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border border-border/50 bg-muted/20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : null}
              <div
                id={containerId}
                className={cn(
                  'min-h-[420px] w-full overflow-hidden rounded-xl border border-border/50 bg-background',
                  '[&_iframe]:w-full [&_iframe]:max-w-full'
                )}
              />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/40 pt-3">
            <p className="text-[11px] font-medium text-muted-foreground">
              Partner: <span className="text-foreground">Omio</span>
              {!configured ? (
                <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                  (widget non configurato)
                </span>
              ) : null}
            </p>
            <p className="ml-auto text-[11px] text-muted-foreground">
              Ricerca su NomadLink · prenotazione Omio
            </p>
          </div>
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

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <p>
          Confronti tratto e orari nel widget Omio su NomadLink. Dopo la ricerca verrai
          reindirizzato su{' '}
          <span className="font-medium text-foreground">Omio</span> per completare
          l&apos;acquisto
          <ExternalLink className="ml-0.5 inline h-3.5 w-3.5 align-text-bottom opacity-70" />
          . Le commissioni affiliate sono tracciate via Impact.
        </p>
      </div>
    </div>
  );
}

function OmioSetupBanner({ mode }: { mode: OmioTransportMode }) {
  const subId = mode === 'bus' ? 'prenota_bus' : 'prenota_treni';
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
      <div className="flex gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-2">
          <p className="font-medium text-foreground">Widget Omio non configurato</p>
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>
              In{' '}
              <a
                href="https://app.impact.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                Impact
              </a>{' '}
              vai su <strong className="font-medium text-foreground">Tools</strong> → widget
              Omio Search (o{' '}
              <a
                href="https://www.omio.com/affiliate/search-widget"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                omio.com/affiliate/search-widget
              </a>
              )
            </li>
            <li>
              Personalizza il widget (lingua IT) e copia lo script embed — estrai lo{' '}
              <strong className="font-medium text-foreground">partner slug</strong> dall&apos;URL{' '}
              <code className="text-xs">widgets-v2.omio.com/…/widgets.js</code>
            </li>
            <li>
              Aggiungi in <code className="text-xs">.env.local</code>:{' '}
              <code className="text-xs">NEXT_PUBLIC_OMIO_PARTNER_SLUG=…</code> oppure{' '}
              <code className="text-xs">NEXT_PUBLIC_OMIO_WIDGET_SCRIPT_URL=…</code>
            </li>
            <li>
              Opzionale: <code className="text-xs">NEXT_PUBLIC_OMIO_WIDGET_IFRAME_SRC=…</code>{' '}
              se Impact fornisce un iframe
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            SubID consigliato per questa tab:{' '}
            <code className="text-xs">{subId}</code> (
            <code className="text-xs">NEXT_PUBLIC_OMIO_SUBID_{mode === 'bus' ? 'BUS' : 'TREN'}</code>
            )
          </p>
        </div>
      </div>
    </div>
  );
}
