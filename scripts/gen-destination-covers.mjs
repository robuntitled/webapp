// Genera cover uniche e pertinenti per ogni paese: capitale (restcountries) →
// immagine skyline/scenario dalla pagina Wikipedia (keyless), scartando
// bandiere/mappe/stemmi. Output statico in lib/composer/destination-covers.generated.ts
// Uso: node scripts/gen-destination-covers.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'lib/composer/continent-countries.ts';
const OUT = 'lib/composer/destination-covers.generated.ts';

const text = readFileSync(SRC, 'utf8');
// Estrae le tuple SEED: ['id', 'Label', 'Region', lat, lng, 'vibe', 'ISO2']
const re = /\[\s*'([^']+)',\s*'([^']+)',\s*'[^']+',\s*[-\d.]+,\s*[-\d.]+,\s*'[^']*',\s*'([A-Z]{2})'\s*\]/g;
const countries = [];
let m;
while ((m = re.exec(text)) !== null) {
  countries.push({ id: m[1], label: m[2], iso2: m[3] });
}
console.log('Paesi trovati:', countries.length);

function stripQuery(u) {
  return u ? u.split('?')[0] : u;
}

const BAD = /Flag_of|Coat_of_arms|Emblem|Location|Orthographic|Locator|_map|Map_of|\.svg|globe|Seal_of|Great_Seal/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wikiImage(title, lang = 'en') {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'NomadLink/1.0 (covers-gen; contact hello@nomadlink.app)' },
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const d = await res.json();
      const img = d?.originalimage?.source || d?.thumbnail?.source;
      if (!img) return null;
      if (BAD.test(img)) return null;
      return stripQuery(img);
    } catch {
      await sleep(500 * (attempt + 1));
    }
  }
  return null;
}

async function getCapitals() {
  const map = {};
  const query =
    'SELECT ?iso ?capLabel WHERE { ?c wdt:P297 ?iso . ?c wdt:P36 ?cap . ?cap rdfs:label ?capLabel FILTER(LANG(?capLabel)="en") }';
  try {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': 'NomadLink/1.0 covers-gen',
      },
    });
    if (res.ok) {
      const data = await res.json();
      for (const b of data.results.bindings) {
        map[b.iso.value.toUpperCase()] = b.capLabel.value;
      }
    }
  } catch (e) {
    console.warn('wikidata fallito:', e.message);
  }
  return map;
}

// Titoli scenografici per città-stato o casi che altrimenti restituiscono bandiere.
const OVERRIDES = {
  singapore: ['Marina Bay, Singapore', 'Merlion'],
  monaco: ['Monte Carlo', 'Monaco'],
  vaticano: ['Vatican City', 'St. Peter\u2019s Square'],
  'san-marino': ['City of San Marino'],
  liechtenstein: ['Vaduz'],
  andorra: ['Andorra la Vella'],
  'hong-kong': ['Hong Kong'],
  bahrein: ['Manama'],
  malta: ['Valletta'],
  seychelles: ['Victoria, Seychelles'],
  maldive: ['Malé'],
  mauritius: ['Port Louis'],
  brunei: ['Bandar Seri Begawan'],
  lussemburgo: ['Luxembourg City'],
  comore: ['Moroni, Comoros'],
  gibuti: ['Djibouti City', 'Djibouti (city)'],
  libia: ['Tripoli, Libya'],
  antigua: ['Nelson\u2019s Dockyard', 'St. John\u2019s, Antigua and Barbuda'],
  'costa-rica': ['San Jos\u00e9, Costa Rica'],
  guyana: ['Georgetown, Guyana'],
};

const capitals = await getCapitals();
console.log('Capitali caricate:', Object.keys(capitals).length);

const covers = {};
const used = new Set();

for (const c of countries) {
  const cap = capitals[c.iso2];
  const candidates = [];
  for (const t of OVERRIDES[c.id] ?? []) candidates.push([t, 'en']);
  if (cap) {
    candidates.push([cap, 'en']);
    candidates.push([`${cap} skyline`, 'en']);
    candidates.push([cap, 'it']);
  }
  candidates.push([c.label, 'it']);
  candidates.push([c.label, 'en']);

  let picked = null;
  for (const [title, lang] of candidates) {
    const img = await wikiImage(title, lang);
    if (img && !used.has(img)) {
      picked = img;
      break;
    }
    // se duplicato ma valido, tienilo come ultima spiaggia
    if (img && !picked) picked = img;
  }

  if (picked) {
    covers[c.id] = picked;
    used.add(picked);
    console.log(`✓ ${c.id} → ${picked.slice(0, 70)}`);
  } else {
    console.log(`✗ ${c.id} (nessuna immagine)`);
  }
  await sleep(120);
}

const entries = Object.entries(covers)
  .map(([id, url]) => `  '${id}': '${url.replace(/'/g, "%27")}',`)
  .join('\n');

const out = `// GENERATO da scripts/gen-destination-covers.mjs — non modificare a mano.
// Cover per-paese (capitale/scenario via Wikipedia). Uniche e pertinenti al luogo.
export const GENERATED_DESTINATION_COVERS: Record<string, string> = {
${entries}
};
`;

writeFileSync(OUT, out, 'utf8');
console.log(`\nScritte ${Object.keys(covers).length} cover in ${OUT}`);
