import 'server-only';

import { systemAdmin } from '@/lib/supabase-scoped';
import { logApiMetric, type ApiMetric } from '@/lib/api/metrics';

export type CostService = 'places' | 'ai' | 'nominatim' | 'other';

/** Stima Places Text/Nearby Enterprise ~$0.035 / req. */
export const EST_PLACES_NETWORK_USD = 0.035;

export async function recordCostEvent(options: {
  service: CostService;
  op: string;
  source: ApiMetric['source'];
  costUsd?: number;
  userId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const cost =
    options.costUsd ??
    (options.service === 'places' && options.source === 'network'
      ? EST_PLACES_NETWORK_USD
      : 0);

  logApiMetric({
    service: options.service,
    op: options.op,
    source: options.source,
    userId: options.userId,
  });

  try {
    await systemAdmin().from('api_cost_events').insert({
      service: options.service,
      op: options.op,
      source: options.source,
      cost_usd: cost,
      user_id: options.userId ?? null,
      meta: options.meta ?? {},
    });
  } catch (e) {
    console.warn('[cost-events] insert failed', e);
  }
}

export type CostSummary = {
  monthKey: string;
  byService: Record<string, { events: number; costUsd: number; network: number; cache: number }>;
  totalCostUsd: number;
  placesCacheHitRate: number | null;
  aiSpendUsd: number;
};

export async function getCostSummary(days = 30): Promise<CostSummary> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const monthKey = new Date().toISOString().slice(0, 7);

  const { data, error } = await systemAdmin()
    .from('api_cost_events')
    .select('service, source, cost_usd')
    .gte('created_at', since);

  const byService: CostSummary['byService'] = {};
  let totalCostUsd = 0;
  let placesNetwork = 0;
  let placesCache = 0;

  if (!error && data) {
    for (const row of data) {
      const service = String(row.service);
      const bucket = byService[service] ?? {
        events: 0,
        costUsd: 0,
        network: 0,
        cache: 0,
      };
      const cost = Number(row.cost_usd) || 0;
      bucket.events += 1;
      bucket.costUsd += cost;
      totalCostUsd += cost;
      if (row.source === 'network') bucket.network += 1;
      if (row.source === 'cache') bucket.cache += 1;
      byService[service] = bucket;

      if (service === 'places') {
        if (row.source === 'network') placesNetwork += 1;
        if (row.source === 'cache') placesCache += 1;
      }
    }
  }

  const placesTotal = placesNetwork + placesCache;
  const placesCacheHitRate =
    placesTotal > 0 ? placesCache / placesTotal : null;

  return {
    monthKey,
    byService,
    totalCostUsd,
    placesCacheHitRate,
    aiSpendUsd: byService.ai?.costUsd ?? 0,
  };
}
