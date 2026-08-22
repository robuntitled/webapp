-- Itinerari ufficiali normalizzati (RAG-ready). Applica: npm run db:itineraries-schema
-- Conserva trip_templates (030) per compat; il catalogo ricco vive qui.

CREATE TABLE IF NOT EXISTS destinations (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  country text NOT NULL,
  continent text NOT NULL,
  allowed_durations int[] NOT NULL DEFAULT '{7}',
  typical_departure_airports_it text[] NOT NULL DEFAULT '{FCO,MXP}',
  active boolean NOT NULL DEFAULT false,
  lat double precision,
  lng double precision,
  emoji text,
  vibe text,
  gradient text,
  timezone text,
  currency_hint text DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Stub legacy (payload-only) → ricrea schema normalizzato
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'itinerary_templates'
      AND column_name = 'payload'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'itinerary_templates'
      AND column_name = 'destination_id'
  ) THEN
    DROP TABLE IF EXISTS itinerary_rag_chunks CASCADE;
    DROP TABLE IF EXISTS itinerary_links CASCADE;
    DROP TABLE IF EXISTS itinerary_pois CASCADE;
    DROP TABLE IF EXISTS itinerary_paid_activities CASCADE;
    DROP TABLE IF EXISTS itinerary_hotels CASCADE;
    DROP TABLE IF EXISTS itinerary_days CASCADE;
    DROP TABLE itinerary_templates CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS itinerary_templates (
  id text PRIMARY KEY,
  destination_id text NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
  destination_slug text NOT NULL,
  destination_name text NOT NULL,
  duration_days int NOT NULL CHECK (duration_days >= 3 AND duration_days <= 45),
  style text NOT NULL CHECK (style IN ('relax', 'entertainment', 'adventure', 'avventura', 'estremo')),
  title text NOT NULL,
  summary text,
  hub_iata text,
  origin_iata_default text NOT NULL DEFAULT 'FCO',
  schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  budget_orientative_eur jsonb NOT NULL DEFAULT '{}'::jsonb,
  logistics_notes text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  schema_version int NOT NULL DEFAULT 1,
  source_bundle text,
  -- Testo piano per ricerca / futuri chunk RAG (embedding in sospeso)
  content_text text,
  -- Payload originale completo (link bindings, ecc.)
  source_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination_id, duration_days, style)
);

CREATE INDEX IF NOT EXISTS itinerary_templates_destination_idx
  ON itinerary_templates (destination_id);
CREATE INDEX IF NOT EXISTS itinerary_templates_slug_duration_idx
  ON itinerary_templates (destination_slug, duration_days);
CREATE INDEX IF NOT EXISTS itinerary_templates_status_idx
  ON itinerary_templates (status);
CREATE INDEX IF NOT EXISTS itinerary_templates_content_fts_idx
  ON itinerary_templates USING gin (to_tsvector('simple', coalesce(content_text, '')));

CREATE TABLE IF NOT EXISTS itinerary_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES itinerary_templates(id) ON DELETE CASCADE,
  day_number int NOT NULL CHECK (day_number >= 1),
  day_offset int NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  area_segment text,
  transfer text,
  is_arrival boolean NOT NULL DEFAULT false,
  is_departure boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (template_id, day_number)
);

CREATE INDEX IF NOT EXISTS itinerary_days_template_idx ON itinerary_days (template_id);

CREATE TABLE IF NOT EXISTS itinerary_pois (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  template_id text NOT NULL REFERENCES itinerary_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  priority text NOT NULL DEFAULT 'core' CHECK (priority IN ('core', 'optional')),
  half_or_full text NOT NULL DEFAULT 'half' CHECK (half_or_full IN ('half', 'full')),
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS itinerary_pois_day_idx ON itinerary_pois (day_id);
CREATE INDEX IF NOT EXISTS itinerary_pois_template_idx ON itinerary_pois (template_id);

CREATE TABLE IF NOT EXISTS itinerary_hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES itinerary_templates(id) ON DELETE CASCADE,
  area_segment text NOT NULL,
  name_or_zone text NOT NULL,
  notes text,
  check_in_offset int NOT NULL DEFAULT 0,
  check_out_offset int NOT NULL DEFAULT 0,
  nights int,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS itinerary_hotels_template_idx ON itinerary_hotels (template_id);

CREATE TABLE IF NOT EXISTS itinerary_paid_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES itinerary_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  day_number int,
  day_offset int,
  slot text CHECK (slot IS NULL OR slot IN ('morning', 'afternoon', 'evening')),
  hint text,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS itinerary_paid_activities_template_idx
  ON itinerary_paid_activities (template_id);

-- Link risolvibili (voli/hotel/auto/mappe/attività) agganciati a template / giorno / hotel / attività
CREATE TABLE IF NOT EXISTS itinerary_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES itinerary_templates(id) ON DELETE CASCADE,
  parent_type text NOT NULL CHECK (parent_type IN ('template', 'day', 'hotel', 'paid_activity')),
  parent_id text NOT NULL,
  link_key text NOT NULL,
  kind text NOT NULL,
  provider text,
  channel text,
  href_template text,
  api_template text,
  bindings jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS itinerary_links_template_idx ON itinerary_links (template_id);
CREATE INDEX IF NOT EXISTS itinerary_links_parent_idx ON itinerary_links (parent_type, parent_id);
CREATE INDEX IF NOT EXISTS itinerary_links_kind_idx ON itinerary_links (kind);

-- Stub RAG: tabella pronta, niente embedding per ora
CREATE TABLE IF NOT EXISTS itinerary_rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL REFERENCES itinerary_templates(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  chunk_kind text NOT NULL CHECK (
    chunk_kind IN ('summary', 'day', 'hotel', 'activity', 'logistics', 'full')
  ),
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS itinerary_rag_chunks_template_idx ON itinerary_rag_chunks (template_id);

COMMENT ON TABLE itinerary_templates IS
  'Template itinerario ufficiali. source_payload = JSON completo; content_text per FTS/RAG futuro.';
COMMENT ON TABLE itinerary_rag_chunks IS
  'Chunk testuali per RAG futuro. Embedding in sospeso.';
