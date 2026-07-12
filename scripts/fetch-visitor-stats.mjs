// Pulls all-time visitor stats from the GoatCounter API and writes
// src/data/visitors.json. Run by .github/workflows/visitor-stats.yml.
// Env: GOATCOUNTER_SITE (site code), GOATCOUNTER_TOKEN (API token, repo secret).
import { writeFileSync } from 'node:fs';
import { z } from 'zod';

// GoatCounter requires a full ISO datetime here; date-only strings error.
const START = '2026-07-01T00:00:00Z'; // predates the site — i.e. all-time

/** [{id,count}] -> {CODE: n}. Uppercases, drops non-alpha-2/non-positive, sums dupes. */
export function aggregateLocations(stats) {
  const countries = {};
  for (const s of stats ?? []) {
    const code = String(s.id ?? '').toUpperCase();
    const count = Number(s.count ?? 0);
    if (!/^[A-Z]{2}$/.test(code) || !(count > 0)) continue;
    countries[code] = (countries[code] ?? 0) + count;
  }
  return countries;
}

export function buildVisitorsJson({ total, locations, now = new Date() }) {
  return {
    updated: now.toISOString().slice(0, 10),
    total: Number(total) || 0,
    countries: aggregateLocations(locations),
  };
}

// Inline copy of visitorsSchema from src/content/schemas.ts (a .mjs cannot
// import the .ts module; keep in sync).
const schema = z.object({
  updated: z.string(),
  total: z.number().int().nonnegative(),
  countries: z.record(z.string().regex(/^[A-Z]{2}$/), z.number().int().positive()),
});

async function api(site, token, path, params = {}) {
  const url = new URL(`https://${site}.goatcounter.com/api/v0/${path}`);
  url.searchParams.set('start', START);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  // GoatCounter occasionally throws transient errors (even 404s); retry before failing the run.
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) return res.json();
    lastErr = new Error(`GoatCounter ${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 5000));
  }
  throw lastErr;
}

async function main() {
  const site = process.env.GOATCOUNTER_SITE;
  const token = process.env.GOATCOUNTER_TOKEN;
  if (!site || !token) throw new Error('GOATCOUNTER_SITE and GOATCOUNTER_TOKEN must be set');

  const totalRes = await api(site, token, 'stats/total');

  const locations = [];
  for (let offset = 0; ; ) {
    const page = await api(site, token, 'stats/locations', { limit: 100, offset });
    const batch = page.stats ?? [];
    locations.push(...batch);
    if (!page.more || batch.length === 0) break;
    offset += batch.length;
  }

  const data = schema.parse(buildVisitorsJson({ total: totalRes.total, locations }));
  writeFileSync(new URL('../src/data/visitors.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
  console.log(`wrote visitors.json: total=${data.total}, countries=${Object.keys(data.countries).length}`);
}

if (process.argv[1] && process.argv[1].endsWith('fetch-visitor-stats.mjs')) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
