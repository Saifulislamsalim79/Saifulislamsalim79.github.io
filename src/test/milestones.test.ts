import { describe, it, expect } from 'vitest';
import {
  pubToMilestone, buildMilestones, groupByYear, selectFeatured,
  type Milestone,
} from '../utils/milestones';
import type { Publication, Event } from '../content/schemas';

const pub = (over: Partial<Publication> = {}): Publication => ({
  title: 'A', authors: ['Saiful Islam Salim'], venue: 'EMNLP', year: 2024,
  type: 'conference', tags: [], status: 'published', featured: false, order: 9,
  ...over,
});

const ev = (over: Partial<Event> = {}): Event => ({
  date: new Date('2024-03-01'), kind: 'award', title: 'Fellowship',
  ...over,
} as Event);

describe('pubToMilestone', () => {
  it('maps a published paper to a news milestone on Jan 1 of its year', () => {
    const m = pubToMilestone(pub({ title: 'PathwayLM', year: 2026, featured: true }));
    expect(m.kind).toBe('news');
    expect(m.title).toBe('PathwayLM');
    expect(m.date).toEqual(new Date('2026-01-01'));
    expect(m.pinned).toBe(true); // featured -> pinned
    expect(m.href).toBeUndefined();
  });

  it('uses the given venue as detail', () => {
    const m = pubToMilestone(pub({ venue: 'Scientific Reports, Nature', year: 2025 }));
    expect(m.detail).toContain('Scientific Reports, Nature');
  });

  it('marks under-review papers with a detail tag', () => {
    const m = pubToMilestone(pub({ status: 'under-review', venue: 'ACL' }));
    expect(m.detail).toMatch(/under review/i);
  });
});

describe('buildMilestones', () => {
  it('merges publications and events and sorts reverse-chronologically', () => {
    const pubs = [
      pub({ title: 'Old', year: 2018 }),
      pub({ title: 'New', year: 2025 }),
    ];
    const events = [
      ev({ date: new Date('2022-06-01'), title: 'Mid' }),
    ];
    const ms = buildMilestones({ publications: pubs, events });
    expect(ms.map(m => m.title)).toEqual(['New', 'Mid', 'Old']);
  });

  it('dedupes a publication and an explicit event sharing the same title+year', () => {
    const pubs = [pub({ title: 'PathwayLM', year: 2026, featured: true })];
    const events = [ev({ date: new Date('2026-01-01'), kind: 'news', title: 'PathwayLM' })];
    const ms = buildMilestones({ publications: pubs, events });
    expect(ms.filter(m => m.title === 'PathwayLM')).toHaveLength(1);
    expect(ms[0].pinned).toBe(true); // publication's featured flag wins on the merge
  });

  it('excludes nothing based on status; under-review still appears', () => {
    const ms = buildMilestones({
      publications: [pub({ status: 'under-review', year: 2026 })],
      events: [],
    });
    expect(ms).toHaveLength(1);
  });
});

describe('groupByYear', () => {
  it('groups milestones by calendar year, descending', () => {
    // Distinct titles: identical title+year would be collapsed by the dedupe rule.
    const pubs = [pub({ title: 'P1', year: 2024 }), pub({ title: 'P2', year: 2024 }), pub({ title: 'P3', year: 2021 })];
    const ms = buildMilestones({ publications: pubs, events: [] });
    const groups = groupByYear(ms);
    expect(groups.map(g => g.year)).toEqual([2024, 2021]);
    expect(groups[0].items).toHaveLength(2);
  });
});

describe('selectFeatured', () => {
  it('returns featured publications, newest first', () => {
    const pubs = [
      pub({ title: 'OldF', featured: true, year: 2021, order: 1 }),
      pub({ title: 'NewF', featured: true, year: 2025, order: 2 }),
      pub({ title: 'NotF', featured: false, year: 2025, order: 0 }),
    ];
    expect(selectFeatured(pubs).map(p => p.title)).toEqual(['NewF', 'OldF']);
    // featured:false excluded even when newest
    expect(selectFeatured(pubs).find(p => p.title === 'NotF')).toBeUndefined();
  });
});
