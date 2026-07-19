import 'server-only';

import { isApiMetricsEnabled } from '@/lib/flags';

export type ApiMetric = {
  service: 'places' | 'ai' | 'nominatim' | 'auth' | 'other';
  op: string;
  source: 'cache' | 'network' | 'mock' | 'none' | 'error';
  ms?: number;
  userId?: string;
  extra?: Record<string, string | number | boolean | undefined>;
};

/** Log strutturato per ottimizzare costi API (filtrabile su Vercel Logs). */
export function logApiMetric(metric: ApiMetric): void {
  if (!isApiMetricsEnabled()) return;
  const payload = {
    type: 'api_metric',
    ...metric,
    ts: new Date().toISOString(),
  };
  // Una riga JSON: facile da aggregare
  console.info(JSON.stringify(payload));
}
