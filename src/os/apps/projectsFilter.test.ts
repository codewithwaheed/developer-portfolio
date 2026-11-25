import { describe, expect, it } from 'vitest';
import type { Project } from '@/content/types';
import { filterProjects } from './projectsFilter';

const p = (o: Partial<Project> & { id: string }): Project => ({
  title: o.id,
  description: '',
  tech: [],
  tags: ['web'],
  featured: false,
  date: '2020-01-01',
  ...o,
});

const all: Project[] = [
  p({ id: 'old-archive', date: '2019-01-01' }),
  p({ id: 'new-archive', date: '2023-01-01', company: '10Pearls' }),
  p({
    id: 'itchatbotassitant',
    featured: true,
    tags: ['ai', 'web'],
    company: '10Pearls',
    date: '2024-01-01',
  }),
  p({
    id: 'finance',
    featured: true,
    tags: ['fintech', 'web'],
    company: 'Renesis Tech',
    date: '2022-01-01',
  }),
];

describe('filterProjects', () => {
  it('filters by tag', () => {
    expect(filterProjects(all, { tag: 'ai' }).map((x) => x.id)).toEqual(['itchatbotassitant']);
  });
  it('filters by company', () => {
    const r = filterProjects(all, { company: '10Pearls' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.company === '10Pearls')).toBe(true);
  });
  it('orders featured first, then date descending', () => {
    const r = filterProjects(all, {});
    expect(r[0].featured).toBe(true);
    expect(r.map((x) => x.id)).toEqual([
      'itchatbotassitant',
      'finance',
      'new-archive',
      'old-archive',
    ]);
  });
  it('does not mutate its input', () => {
    const copy = [...all];
    filterProjects(all, {});
    expect(all).toEqual(copy);
  });
});
