'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ProviderCard = {
  id: string;
  name: string;
  category: string;
  configured: boolean;
  inApp: string;
  consoleUrl: string;
  billingUrl?: string;
  note?: string;
  metrics?: { label: string; value: string }[];
};

type HubPayload = {
  summary: {
    monthKey: string;
    totalCostUsd: number;
    placesCacheHitRate: number | null;
    byService: Record<
      string,
      { events: number; costUsd: number; network: number; cache: number }
    >;
  };
  redisAiSpend: number;
  aiBudgetUsd: number;
  redisOk: boolean | null;
  providers: ProviderCard[];
  generatedAt: string;
};

function pct(n: number | null): string {
  if (n == null) return '—';
  return `${Math.round(n * 100)}%`;
}

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

const CATEGORY_LABEL: Record<string, string> = {
  maps: 'Mappe',
  ai: 'AI',
  infra: 'Infra',
  comms: 'Comms',
  media: 'Media',
  affiliate: 'Affiliate',
};

export function AdminCostsHub({ initial }: { initial: HubPayload }) {
  const [hub, setHub] = useState(initial);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/costs', { cache: 'no-store' });
      if (res.ok) {
        setHub((await res.json()) as HubPayload);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const rows = Object.entries(hub.summary.byService).sort(
    (a, b) => b[1].costUsd - a[1].costUsd
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Aggiornato{' '}
          {new Date(hub.generatedAt).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}{' '}
          · refresh ogni 30s
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Aggiorna
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-background/70 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Totale stimato (in-app)
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {usd(hub.summary.totalCostUsd)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Non è la fattura Google/Vercel
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-background/70 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Places cache hit
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {pct(hub.summary.placesCacheHitRate)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-background/70 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            AI spend Redis {hub.summary.monthKey}
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {usd(hub.redisAiSpend)}
            {hub.aiBudgetUsd > 0 ? (
              <span className="text-base font-normal text-muted-foreground">
                {' '}
                / {usd(hub.aiBudgetUsd)}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Provider</h2>
          <p className="text-sm text-muted-foreground">
            Metriche in-app + link alle console ufficiali. La fattura reale resta
            sul provider.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {hub.providers.map((p) => (
            <article
              key={p.id}
              className="rounded-2xl border border-white/10 bg-background/70 p-4 backdrop-blur space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {CATEGORY_LABEL[p.category] ?? p.category}
                  </p>
                  <h3 className="font-medium">{p.name}</h3>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    p.configured
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  {p.configured ? 'Configurato' : 'Manca env'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{p.inApp}</p>
              {p.note ? <p className="text-xs text-muted-foreground/90">{p.note}</p> : null}
              {p.metrics && p.metrics.length > 0 ? (
                <dl className="grid grid-cols-2 gap-2">
                  {p.metrics.map((m) => (
                    <div key={m.label} className="rounded-xl bg-muted/40 px-2.5 py-2">
                      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {m.label}
                      </dt>
                      <dd className="text-sm font-medium tabular-nums">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={p.consoleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted"
                >
                  Console <ExternalLink className="h-3 w-3" />
                </a>
                {p.billingUrl ? (
                  <a
                    href={p.billingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted"
                  >
                    Billing <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-background/70 backdrop-blur">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="font-display text-base font-semibold">Eventi interni (30 giorni)</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Servizio</th>
              <th className="px-4 py-3 font-medium">Eventi</th>
              <th className="px-4 py-3 font-medium">Network</th>
              <th className="px-4 py-3 font-medium">Cache</th>
              <th className="px-4 py-3 font-medium">Stima</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nessun evento ancora.
                </td>
              </tr>
            ) : (
              rows.map(([service, stats]) => (
                <tr key={service} className="border-b border-white/5">
                  <td className="px-4 py-3 font-medium capitalize">{service}</td>
                  <td className="px-4 py-3">{stats.events}</td>
                  <td className="px-4 py-3">{stats.network}</td>
                  <td className="px-4 py-3">{stats.cache}</td>
                  <td className="px-4 py-3">{usd(stats.costUsd)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Non si può “infilare” la console Google dentro Flygetr senza Billing API /
        BigQuery export (service account). Qui monitori in tempo reale ciò che
        l’app misura, e apri con un click le console ufficiali per i costi reali.
      </p>
    </div>
  );
}
