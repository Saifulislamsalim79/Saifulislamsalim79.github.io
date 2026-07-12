import type { Publication, Event, EventKind } from '../content/schemas';

export type Milestone = {
  date: Date;
  end?: Date;
  kind: EventKind;
  title: string;
  detail?: string;
  href?: string;
  pinned: boolean;
};

type YearGroup = { year: number; items: Milestone[] };

// All milestone dates are UTC midnights: frontmatter dates parse as UTC, and
// publication years anchor to Jan 1 UTC. Grouping/keying must use UTC getters
// or dates shift a day (and near Jan 1, a year) in negative-offset timezones.
const keyOf = (m: { title: string; date: Date }) => `${m.title}|${m.date.getUTCFullYear()}`;

/** Convert a publication entry into a timeline milestone. */
export function pubToMilestone(pub: Publication): Milestone {
  const detailParts: string[] = [pub.venue];
  if (pub.status === 'under-review') detailParts.push('(under review)');
  if (pub.award) detailParts.push(pub.award);
  return {
    date: new Date(Date.UTC(pub.year, 0, 1)),
    kind: 'news',
    title: pub.title,
    detail: detailParts.join(' · '),
    // Prefer the locally served PDF; consumers pass hrefs through path() so
    // the site-internal /papers/ route works under any base.
    href: pub.pdf ? `/papers/${pub.pdf}` : pub.url,
    pinned: Boolean(pub.featured),
  };
}

/** Merge publication-derived and explicit event milestones, dedupe, sort desc by date. */
export function buildMilestones(input: { publications: Publication[]; events: Event[] }): Milestone[] {
  const fromPubs = input.publications.map(pubToMilestone);
  const fromEvents: Milestone[] = input.events.map(e => ({
    date: e.date,
    end: e.end,
    kind: e.kind,
    title: e.title,
    detail: e.detail,
    href: e.href,
    pinned: Boolean(e.pinned),
  }));

  // Prefer the publication-derived entry on a title+year collision (it carries featured).
  const seen = new Set<string>();
  const merged: Milestone[] = [];
  for (const m of [...fromPubs, ...fromEvents]) {
    const k = keyOf(m);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(m);
  }
  merged.sort((a, b) => b.date.getTime() - a.date.getTime());
  return merged;
}

/** Group milestones into descending calendar years. */
export function groupByYear(ms: Milestone[]): YearGroup[] {
  const map = new Map<number, Milestone[]>();
  for (const m of ms) {
    const y = m.date.getUTCFullYear();
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(m);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({ year, items }));
}

/**
 * Featured publications, newest first. Sorting by year (not the per-type `order`
 * axis) reproduces the hand-curated featured order on Home — PathwayLM (2026),
 * Nature rail (2025), Impeding (2024), Long-Range (2022) — without coupling to
 * the within-type CV ranking used by the Publications page.
 */
export function selectFeatured(pubs: Publication[]): Publication[] {
  return pubs
    .filter(p => p.featured)
    .sort((a, b) => b.year - a.year);
}
