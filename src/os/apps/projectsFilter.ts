import type { Project, ProjectTag } from '@/content/types';

/** Featured first, then newest first. Pure: never mutates the input. */
export function filterProjects(
  projects: Project[],
  f: { tag?: ProjectTag; company?: string },
): Project[] {
  return projects
    .filter((p) => (!f.tag || p.tags.includes(f.tag)) && (!f.company || p.company === f.company))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.date.localeCompare(a.date));
}
