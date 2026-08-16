import 'server-only';

import { getMonthlySpendUsdAsync } from '@/lib/ai/budget';
import { getAiConfig } from '@/lib/ai/config';
import { getCostSummary, type CostSummary } from '@/lib/api/cost-events';
import { isUpstashConfigured, redisSet } from '@/lib/redis/upstash';

export type ProviderCard = {
  id: string;
  name: string;
  category: 'maps' | 'ai' | 'infra' | 'comms' | 'media' | 'affiliate';
  configured: boolean;
  /** Cosa misuriamo in-app (non è la fattura del provider). */
  inApp: string;
  /** Link console ufficiale. */
  consoleUrl: string;
  /** Billing / usage ufficiale se diverso. */
  billingUrl?: string;
  note?: string;
  metrics?: { label: string; value: string }[];
};

function envSet(...keys: string[]): boolean {
  return keys.some((k) => Boolean(process.env[k]?.trim()));
}

export type AdminCostHub = {
  summary: CostSummary;
  redisAiSpend: number;
  aiBudgetUsd: number;
  redisOk: boolean | null;
  providers: ProviderCard[];
  generatedAt: string;
};

export async function getAdminCostHub(days = 30): Promise<AdminCostHub> {
  const [summary, redisAiSpend] = await Promise.all([
    getCostSummary(days),
    getMonthlySpendUsdAsync(),
  ]);

  const ai = getAiConfig();
  const budget = Number(process.env.AI_MONTHLY_BUDGET_USD) || 0;

  let redisOk: boolean | null = null;
  if (isUpstashConfigured()) {
    try {
      redisOk = await redisSet('__nomadlink_admin_ping__', '1', 10_000);
    } catch {
      redisOk = false;
    }
  }

  const places = summary.byService.places;
  const aiEvents = summary.byService.ai;
  const nominatim = summary.byService.nominatim;

  const providers: ProviderCard[] = [
    {
      id: 'google-places',
      name: 'Google Places / Maps',
      category: 'maps',
      configured: envSet('GOOGLE_MAPS_API_KEY', 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'),
      inApp: 'Eventi + stima $0.035/req network (cache = $0)',
      consoleUrl: 'https://console.cloud.google.com/google/maps-apis/metrics',
      billingUrl: 'https://console.cloud.google.com/billing',
      note: 'La fattura reale è su Google Cloud. Free tier per SKU (non più credito $200).',
      metrics: [
        { label: 'Eventi 30g', value: String(places?.events ?? 0) },
        { label: 'Network', value: String(places?.network ?? 0) },
        { label: 'Cache', value: String(places?.cache ?? 0) },
        {
          label: 'Stima',
          value: `$${(places?.costUsd ?? 0).toFixed(2)}`,
        },
      ],
    },
    {
      id: 'gemini-ai',
      name: 'AI (Gemini / OpenAI-compatible)',
      category: 'ai',
      configured: Boolean(ai.enabled && (ai.geminiApiKey || ai.openaiApiKey)),
      inApp: 'Token → stima USD + budget Redis mensile',
      consoleUrl:
        ai.provider === 'gemini'
          ? 'https://aistudio.google.com/usage'
          : 'https://platform.openai.com/usage',
      billingUrl:
        ai.provider === 'gemini'
          ? 'https://console.cloud.google.com/billing'
          : 'https://platform.openai.com/account/billing',
      note: `Provider attivo: ${ai.provider}${ai.model ? ` · ${ai.model}` : ''}`,
      metrics: [
        { label: 'Eventi 30g', value: String(aiEvents?.events ?? 0) },
        { label: 'Spend mese (Redis)', value: `$${redisAiSpend.toFixed(2)}` },
        {
          label: 'Budget mese',
          value: budget > 0 ? `$${budget.toFixed(0)}` : 'illimitato',
        },
      ],
    },
    {
      id: 'upstash',
      name: 'Upstash Redis',
      category: 'infra',
      configured: isUpstashConfigured(),
      inApp: 'Rate-limit, AI cache/budget, Places L2',
      consoleUrl: 'https://console.upstash.com/',
      note:
        redisOk == null
          ? 'Non configurato'
          : redisOk
            ? 'Ping OK'
            : 'Configurato ma ping fallito',
      metrics: [
        {
          label: 'Stato',
          value: redisOk == null ? '—' : redisOk ? 'Online' : 'Errore',
        },
      ],
    },
    {
      id: 'vercel',
      name: 'Vercel',
      category: 'infra',
      configured: true,
      inApp: 'Deploy + runtime (non fatturato qui)',
      consoleUrl: 'https://vercel.com/dashboard',
      billingUrl: 'https://vercel.com/account/billing',
      note: 'Usage/bandwidth solo dalla console Vercel (API token opzionale in futuro).',
    },
    {
      id: 'supabase',
      name: 'Supabase',
      category: 'infra',
      configured: envSet('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'),
      inApp: 'DB + eventi costi (`api_cost_events`)',
      consoleUrl: 'https://supabase.com/dashboard',
      billingUrl: 'https://supabase.com/dashboard/org/_/billing',
    },
    {
      id: 'whatsapp-twilio',
      name: 'WhatsApp / Twilio',
      category: 'comms',
      configured: envSet('WHATSAPP_ACCESS_TOKEN', 'TWILIO_ACCOUNT_SID'),
      inApp: 'OTP (non ancora in tabella costi)',
      consoleUrl: envSet('WHATSAPP_ACCESS_TOKEN')
        ? 'https://developers.facebook.com/apps/'
        : 'https://console.twilio.com/',
      billingUrl: envSet('TWILIO_ACCOUNT_SID')
        ? 'https://console.twilio.com/us1/billing'
        : 'https://business.facebook.com/billing',
      note: 'Costo tipico: ~1 SMS/WhatsApp per utente (una tantum).',
    },
    {
      id: 'nominatim',
      name: 'Nominatim (OSM)',
      category: 'maps',
      configured: true,
      inApp: 'Destinazioni + reverse geo (gratis, rate-limited)',
      consoleUrl: 'https://operations.osmfoundation.org/policies/nominatim/',
      metrics: [
        { label: 'Eventi 30g', value: String(nominatim?.events ?? 0) },
      ],
    },
    {
      id: 'pexels',
      name: 'Pexels',
      category: 'media',
      configured: envSet('PEXELS_API_KEY'),
      inApp: 'Cover viaggio (gratis con API key)',
      consoleUrl: 'https://www.pexels.com/api/',
    },
    {
      id: 'liteapi',
      name: 'LiteAPI (Nuitee Connect)',
      category: 'affiliate',
      configured: envSet('LITEAPI_KEY', 'LITE_API_KEY'),
      inApp: 'Hotel + voli in-app (search/prebook/book)',
      consoleUrl: 'https://dashboard.liteapi.travel/',
      billingUrl: 'https://docs.liteapi.travel/',
      note: 'Hotel + voli in-app. Auto: Duffel Cars.',
    },
    {
      id: 'duffel-cars',
      name: 'Duffel Cars',
      category: 'affiliate',
      configured: envSet('DUFFEL_ACCESS_TOKEN'),
      inApp: 'Noleggio auto search/quote/book (postpaid)',
      consoleUrl: 'https://app.duffel.com',
      billingUrl: 'https://duffel.com/pricing',
      note: 'Token test `duffel_test_…`. Live: Request access to Cars. Pay-as-you-go, no fee mensile pubblica per Cars.',
    },
  ];

  return {
    summary,
    redisAiSpend,
    aiBudgetUsd: budget,
    redisOk,
    providers,
    generatedAt: new Date().toISOString(),
  };
}
