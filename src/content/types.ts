export type ProjectTag = 'ai' | 'blockchain' | 'fintech' | 'web';

export interface JobRole {
  title: string;
  /** e.g. "Jan 2023 - Mar 2025"; omitted until known */
  range?: string;
}

export interface Job {
  slug: string;
  /** The current (highest) title. */
  title: string;
  /** Titles held at this company, newest first; only present when there was a promotion. */
  roles?: JobRole[];
  company: string;
  /** public path to the company logo */
  logo?: string;
  location: string;
  range: string;
  url: string;
  bullets: string[];
  order: number;
}

export interface Project {
  id: string;
  title: string;
  /** html */
  description: string;
  tech: string[];
  tags: ProjectTag[];
  company?: string;
  github?: string;
  external?: string;
  cta?: string;
  /** public path */
  cover?: string;
  featured: boolean;
  date: string;
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  html: string;
}

export interface About {
  html: string;
  skills: string[];
  photo: '/me.jpg';
}

export interface PortfolioContent {
  about: About;
  jobs: Job[];
  projects: Project[];
  posts: Post[];
}
