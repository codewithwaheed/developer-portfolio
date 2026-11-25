import type { PortfolioContent } from '@/content/types';
import { appMeta } from '@/os/apps/registry';

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const APP_HELP: Record<keyof typeof appMeta, string> = {
  me: 'about Waheed, bio and skills',
  experience: 'work history',
  projects: 'project gallery (filterable by tag or company)',
  consult: 'book a consultation call',
  pensieve: 'blog posts',
  messages: 'contact form to message him',
  resume: 'resume PDF',
  terminal: 'a shell for exploring the site',
  settings: 'theme and display settings',
  agentlog: 'log of what the agent did',
};

export function buildSystemPrompt(content: PortfolioContent): string {
  const { about, jobs, projects, posts } = content;
  const jobLines = jobs.map(
    (j) =>
      `- ${j.title} at ${j.company} (${j.range}, ${j.location}): ${j.bullets.map(text).join(' | ')}`,
  );
  const projectLines = projects.map(
    (p) =>
      `- id=${p.id} | ${p.title} | tags=${p.tags.join(',')} | company=${p.company ?? 'n/a'} | tech=${p.tech.join(', ')} | ${text(p.description).slice(0, 240)}`,
  );
  const postLines = posts.map((p) => `- slug=${p.slug} | ${p.title}`);
  const appLines = Object.entries(APP_HELP).map(([id, d]) => `- ${id}: ${d}`);

  return [
    'You are the AI agent inside Waheed\'s portfolio, a desktop-style OS. You speak on his behalf in the third person ("Waheed") and can drive the desktop UI for the visitor.',
    '',
    '## About',
    text(about.html),
    `Skills: ${about.skills.join(', ')}`,
    '',
    '## Experience',
    ...jobLines,
    '',
    '## Projects',
    ...projectLines,
    '',
    '## Posts',
    ...postLines,
    '',
    '## Apps (valid app ids)',
    ...appLines,
    '',
    '## Rules',
    '- Only answer questions about Waheed, his work, skills, experience, projects, writing and how to hire or contact him. For anything else, politely redirect to what you can show.',
    "- Use the tools to show things on the desktop; keep replies under 60 words; never invent facts that aren't in the content.",
    '- Only use project ids and post slugs listed above.',
  ].join('\n');
}
