-- Job async per generazione AI + eventi costi API (dashboard).

CREATE TABLE IF NOT EXISTS public.composer_ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'done', 'error')),
  request jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS composer_ai_jobs_user_created_idx
  ON public.composer_ai_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS composer_ai_jobs_status_created_idx
  ON public.composer_ai_jobs (status, created_at ASC)
  WHERE status IN ('queued', 'running');

ALTER TABLE public.composer_ai_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.composer_ai_jobs FROM anon, authenticated;

-- Metriche costi (Places miss, AI spend, ecc.)
CREATE TABLE IF NOT EXISTS public.api_cost_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL CHECK (service IN ('places', 'ai', 'nominatim', 'other')),
  op text NOT NULL,
  source text NOT NULL DEFAULT 'network'
    CHECK (source IN ('cache', 'network', 'mock', 'none', 'error')),
  cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_cost_events_created_idx
  ON public.api_cost_events (created_at DESC);

CREATE INDEX IF NOT EXISTS api_cost_events_service_created_idx
  ON public.api_cost_events (service, created_at DESC);

ALTER TABLE public.api_cost_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_cost_events FROM anon, authenticated;
