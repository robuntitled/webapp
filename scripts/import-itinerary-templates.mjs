#!/usr/bin/env node
/**
 * Importa itinerari JSON normalizzati in Postgres (schema 036).
 *
 * Uso:
 *   npm run db:itineraries
 *   npm run db:itineraries -- data/itineraries/americas-v1.json
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { runSqlFile, withPgClient } from './db-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DEFAULT_BUNDLE = path.join(ROOT, 'data/itineraries/americas-v1.json.gz');
const CATALOG_SEED = path.join(ROOT, 'lib/catalog/excel-seed.json');
const SCHEMA_SQL = path.join(ROOT, 'supabase/migrations/036_itinerary_templates_normalized.sql');

const IT_HUBS = ['FCO', 'MXP', 'LIN', 'BGY', 'VCE', 'NAP', 'BLQ', 'PSA', 'CTA', 'PMO'];

function readJsonBundle(filePath) {
  const buf = fs.readFileSync(filePath);
  const text = filePath.endsWith('.gz')
    ? zlib.gunzipSync(buf).toString('utf8')
    : buf.toString('utf8');
  return JSON.parse(text);
}

function buildContentText(t) {
  const lines = [
    t.title,
    t.summary,
    `Destinazione: ${t.destination_name} (${t.destination_slug})`,
    `Durata: ${t.duration_days} giorni · Stile: ${t.style}`,
    t.hub_iata ? `Hub: ${t.hub_iata}` : null,
    '',
    'Giorni:',
  ];
  for (const day of t.days ?? []) {
    lines.push(
      `Giorno ${day.day_number}: ${day.title} — ${day.area_segment ?? ''}`,
      day.description ?? ''
    );
    for (const poi of day.pois ?? []) {
      lines.push(`  - [${poi.priority}/${poi.half_or_full}] ${poi.name}`);
    }
  }
  if (t.hotels?.length) {
    lines.push('', 'Hotel:');
    for (const h of t.hotels) {
      lines.push(`- ${h.area_segment}: ${h.name_or_zone}${h.notes ? ` (${h.notes})` : ''}`);
    }
  }
  if (t.paid_activities?.length) {
    lines.push('', 'Attività a pagamento:');
    for (const a of t.paid_activities) {
      lines.push(`- G${a.day_number} ${a.slot ?? ''}: ${a.title}${a.hint ? ` — ${a.hint}` : ''}`);
    }
  }
  if (t.logistics_notes) {
    lines.push('', 'Logistica:', t.logistics_notes);
  }
  return lines.filter((x) => x != null).join('\n');
}

async function upsertDestinations(client, neededSlugs) {
  const seed = JSON.parse(fs.readFileSync(CATALOG_SEED, 'utf8'));
  const bySlug = new Map(seed.destinations.map((d) => [d.slug, d]));
  let n = 0;
  for (const slug of neededSlugs) {
    const d = bySlug.get(slug);
    if (!d) {
      console.warn(`⚠️  Destinazione catalogo mancante: ${slug}`);
      continue;
    }
    await client.query(
      `INSERT INTO destinations (
         id, slug, name, country, continent, allowed_durations,
         typical_departure_airports_it, active, lat, lng, emoji, vibe, gradient
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         slug = EXCLUDED.slug,
         name = EXCLUDED.name,
         country = EXCLUDED.country,
         continent = EXCLUDED.continent,
         allowed_durations = EXCLUDED.allowed_durations,
         typical_departure_airports_it = EXCLUDED.typical_departure_airports_it,
         lat = EXCLUDED.lat,
         lng = EXCLUDED.lng,
         emoji = EXCLUDED.emoji,
         vibe = EXCLUDED.vibe,
         gradient = EXCLUDED.gradient`,
      [
        d.id,
        d.slug,
        d.name,
        d.country,
        d.continent,
        d.allowedDurations,
        IT_HUBS,
        Boolean(d.active),
        d.lat ?? null,
        d.lng ?? null,
        d.emoji ?? null,
        d.vibe ?? null,
        d.gradient ?? null,
      ]
    );
    n += 1;
  }
  return n;
}

async function insertLinks(client, templateId, parentType, parentId, links) {
  if (!links?.length) return;
  let sort = 0;
  for (const link of links) {
    await client.query(
      `INSERT INTO itinerary_links (
         template_id, parent_type, parent_id, link_key, kind, provider, channel,
         href_template, api_template, bindings, sort_order
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        templateId,
        parentType,
        parentId,
        link.id ?? `${parentType}-${sort}`,
        link.kind,
        link.provider ?? null,
        link.channel ?? null,
        link.href_template ?? null,
        link.api_template ?? null,
        JSON.stringify(link.bindings ?? {}),
        sort++,
      ]
    );
  }
}

async function importTemplate(client, t, sourceBundle) {
  const contentText = buildContentText(t);
  await client.query(
    `INSERT INTO itinerary_templates (
       id, destination_id, destination_slug, destination_name, duration_days, style,
       title, summary, hub_iata, origin_iata_default, schedule, budget_orientative_eur,
       logistics_notes, status, schema_version, source_bundle, content_text, source_payload,
       updated_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,1,$15,$16,$17::jsonb, now()
     )
     ON CONFLICT (id) DO UPDATE SET
       destination_id = EXCLUDED.destination_id,
       destination_slug = EXCLUDED.destination_slug,
       destination_name = EXCLUDED.destination_name,
       duration_days = EXCLUDED.duration_days,
       style = EXCLUDED.style,
       title = EXCLUDED.title,
       summary = EXCLUDED.summary,
       hub_iata = EXCLUDED.hub_iata,
       origin_iata_default = EXCLUDED.origin_iata_default,
       schedule = EXCLUDED.schedule,
       budget_orientative_eur = EXCLUDED.budget_orientative_eur,
       logistics_notes = EXCLUDED.logistics_notes,
       status = EXCLUDED.status,
       source_bundle = EXCLUDED.source_bundle,
       content_text = EXCLUDED.content_text,
       source_payload = EXCLUDED.source_payload,
       updated_at = now()`,
    [
      t.template_id,
      t.destination_id,
      t.destination_slug,
      t.destination_name,
      t.duration_days,
      t.style,
      t.title,
      t.summary ?? null,
      t.hub_iata ?? null,
      t.origin_iata_default ?? 'FCO',
      JSON.stringify(t.schedule ?? {}),
      JSON.stringify(t.budget_orientative_eur ?? {}),
      t.logistics_notes ?? null,
      t.status ?? 'published',
      sourceBundle,
      contentText,
      JSON.stringify(t),
    ]
  );

  await client.query(`DELETE FROM itinerary_links WHERE template_id = $1`, [t.template_id]);
  await client.query(`DELETE FROM itinerary_pois WHERE template_id = $1`, [t.template_id]);
  await client.query(`DELETE FROM itinerary_days WHERE template_id = $1`, [t.template_id]);
  await client.query(`DELETE FROM itinerary_hotels WHERE template_id = $1`, [t.template_id]);
  await client.query(`DELETE FROM itinerary_paid_activities WHERE template_id = $1`, [t.template_id]);

  await insertLinks(client, t.template_id, 'template', t.template_id, t.link_templates);

  for (const day of t.days ?? []) {
    const dayRes = await client.query(
      `INSERT INTO itinerary_days (
         template_id, day_number, day_offset, title, description, area_segment,
         transfer, is_arrival, is_departure, sort_order
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        t.template_id,
        day.day_number,
        day.day_offset ?? day.day_number - 1,
        day.title,
        day.description ?? null,
        day.area_segment ?? null,
        day.transfer ?? null,
        Boolean(day.is_arrival),
        Boolean(day.is_departure),
        day.day_number,
      ]
    );
    const dayId = dayRes.rows[0].id;
    let poiSort = 0;
    for (const poi of day.pois ?? []) {
      await client.query(
        `INSERT INTO itinerary_pois (
           day_id, template_id, name, priority, half_or_full, sort_order
         ) VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          dayId,
          t.template_id,
          poi.name,
          poi.priority === 'optional' ? 'optional' : 'core',
          poi.half_or_full === 'full' ? 'full' : 'half',
          poiSort++,
        ]
      );
    }
    await insertLinks(client, t.template_id, 'day', dayId, day.links);
  }

  let hotelSort = 0;
  for (const hotel of t.hotels ?? []) {
    const hRes = await client.query(
      `INSERT INTO itinerary_hotels (
         template_id, area_segment, name_or_zone, notes,
         check_in_offset, check_out_offset, nights, sort_order
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        t.template_id,
        hotel.area_segment,
        hotel.name_or_zone,
        hotel.notes ?? null,
        hotel.check_in_offset ?? 0,
        hotel.check_out_offset ?? 0,
        hotel.nights ?? null,
        hotelSort++,
      ]
    );
    await insertLinks(client, t.template_id, 'hotel', hRes.rows[0].id, hotel.links);
  }

  let actSort = 0;
  for (const act of t.paid_activities ?? []) {
    const aRes = await client.query(
      `INSERT INTO itinerary_paid_activities (
         template_id, title, day_number, day_offset, slot, hint, sort_order
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        t.template_id,
        act.title,
        act.day_number ?? null,
        act.day_offset ?? null,
        act.slot ?? null,
        act.hint ?? null,
        actSort++,
      ]
    );
    await insertLinks(client, t.template_id, 'paid_activity', aRes.rows[0].id, act.links);
  }
}

const bundlePath = path.resolve(process.argv[2] || DEFAULT_BUNDLE);
if (!fs.existsSync(bundlePath)) {
  console.error(`File non trovato: ${bundlePath}`);
  process.exit(1);
}

const templates = readJsonBundle(bundlePath);
if (!Array.isArray(templates) || templates.length === 0) {
  console.error('JSON vuoto o non array');
  process.exit(1);
}

const sourceBundle = path.basename(bundlePath).replace(/\.json(\.gz)?$/, '');
const neededSlugs = [...new Set(templates.map((t) => t.destination_slug))];

await withPgClient(async (client) => {
  await runSqlFile(client, SCHEMA_SQL);

  const destCount = await upsertDestinations(client, neededSlugs);
  console.log(`Destinazioni upsert: ${destCount}/${neededSlugs.length}`);

  const existing = await client.query(
    `SELECT id FROM destinations WHERE id = ANY($1::text[])`,
    [neededSlugs]
  );
  const okIds = new Set(existing.rows.map((r) => r.id));
  const usable = templates.filter((t) => okIds.has(t.destination_id));
  const skipped = templates.length - usable.length;
  if (skipped) {
    console.warn(`Saltati ${skipped} template (destinazione assente in catalogo/DB)`);
  }

  let i = 0;
  for (const t of usable) {
    await client.query('BEGIN');
    try {
      await importTemplate(client, t, sourceBundle);
      await client.query('COMMIT');
      i += 1;
      if (i % 10 === 0 || i === usable.length) {
        console.log(`Importati ${i}/${usable.length}`);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Errore su ${t.template_id}:`, err.message);
      throw err;
    }
  }

  const stats = await client.query(`
    SELECT
      (SELECT count(*)::int FROM itinerary_templates) AS templates,
      (SELECT count(*)::int FROM itinerary_days) AS days,
      (SELECT count(*)::int FROM itinerary_pois) AS pois,
      (SELECT count(*)::int FROM itinerary_hotels) AS hotels,
      (SELECT count(*)::int FROM itinerary_paid_activities) AS activities,
      (SELECT count(*)::int FROM itinerary_links) AS links
  `);
  console.log('✅ DB itinerari:', stats.rows[0]);

  await client.query(`
    UPDATE destinations d SET allowed_durations = sub.durs
    FROM (
      SELECT destination_id,
             array_agg(DISTINCT duration_days ORDER BY duration_days) AS durs
      FROM itinerary_templates
      GROUP BY destination_id
    ) sub
    WHERE d.id = sub.destination_id
  `);
  console.log('✅ destinations.allowed_durations allineate ai template');
});
