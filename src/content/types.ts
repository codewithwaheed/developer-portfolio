export type ProjectTag = 'ai' | 'blockchain' | 'fintech' | 'web';

export interface Job {
  slug: string;
  title: string;
  company: string;
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
