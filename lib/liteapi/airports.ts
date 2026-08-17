import 'server-only';

import { liteApiFetch } from '@/lib/liteapi/client';

export type LiteAirport = {
  iata: string;
  icao?: string | null;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
};

type AirportsResponse = {
  data?: unknown;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function parseAirport(raw: unknown): LiteAirport | null {
  const row = asRecord(raw);
  if (!row) return null;
  const iata = str(row.iata) ?? str(row.code);
  const lat = num(row.lat) ?? num(row.latitude);
  const lon = num(row.lon) ?? num(row.lng) ?? num(row.longitude);
  if (!iata || iata.length !== 3 || lat == null || lon == null) return null;
  return {
    iata: iata.toUpperCase(),
    icao: str(row.icao),
    name: str(row.name) ?? iata.toUpperCase(),
    city: str(row.city) ?? str(row.name) ?? iata.toUpperCase(),
    country: str(row.country) ?? '',
    lat,
    lon,
  };
}

function collectAirports(payload: unknown): LiteAirport[] {
  const root = asRecord(payload);
  const data = root?.data ?? payload;
  const out: LiteAirport[] = [];

  const pushList = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      const nested = asRecord(item);
      if (nested && Array.isArray(nested.airports)) {
        for (const a of nested.airports) {
          const parsed = parseAirport(a);
          if (parsed) out.push(parsed);
        }
        continue;
      }
      const parsed = parseAirport(item);
      if (parsed) out.push(parsed);
    }
  };

  pushList(data);
  if (!out.length && Array.isArray(payload)) pushList(payload);
  return out;
}

export async function searchLiteAirports(query: string): Promise<LiteAirport[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await liteApiFetch<AirportsResponse>(
    `/data/flights/airports?q=${encodeURIComponent(q)}`,
    { timeoutMs: 12_000 }
  );
  const seen = new Set<string>();
  return collectAirports(res).filter((a) => {
    if (seen.has(a.iata)) return false;
    seen.add(a.iata);
    return true;
  });
}
