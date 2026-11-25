import type { PortfolioContent, Project, ProjectTag } from '@/content/types';
import type { AppId } from '@/os/apps/registry';
import type { AgentAction } from './actions';

/** Optimal-string-alignment distance: insert, delete, substitute or swap adjacent letters. */
export function damerauLevenshtein(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

interface Intent {
  id: string;
  keywords: string[];
  /** Tie-break: 3 project, company and post, 2 category, 1 general. */
  weight: 1 | 2 | 3;
  /** Distinct keywords needed to match (default 1); weak, generic intents ask for more. */
  minScore?: number;
  plan: AgentAction[];
}

const say = (text: string): AgentAction => ({ type: 'say', text });
const open = (app: AppId): AgentAction => ({ type: 'open_app', app });

const simple = (id: string, keywords: string[], app: AppId | null, text: string): Intent => ({
  id,
  keywords,
  weight: 1,
  plan: app ? [open(app), say(text)] : [say(text)],
});

const category = (tag: ProjectTag, keywords: string[], text: string): Intent => ({
  id: tag,
  keywords: [tag, ...keywords],
  weight: 2,
  plan: [open('projects'), { type: 'filter_projects', tag }, say(text)],
});

const PROJECT_KEYWORDS: Record<string, string[]> = {
  itchatbotassitant: [
    'itchatbotassitant',
    'itchatbot',
    'itsupport',
    'assistant',
    'assitant',
    'openai',
    'chatbot',
  ],
  financethat: ['financethat'],
  vafacosmo: ['vafacosmo', 'vaffacosmo', 'vaffa', 'vafa', 'cosmo', 'nft'],
  omnipresenti: ['omnipresenti', 'omnipresent', 'omni', 'presenti'],
};

const COMPANY_KEYWORDS: Record<string, string[]> = {
  '10pearls': ['10pearls', 'pearls'],
  renesistech: ['renesistech', 'renesis'],
  webwrite: ['webwrite'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** "ITSupportAssistant-OpenAI" -> "IT Support Assistant" */
function shortTitle(p: Project): string {
  return p.title
    .split(/[-|]/)[0]
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

const TITLE_STOP = new Set([
  'with',
  'from',
  'that',
  'this',
  'using',
  'your',
  'have',
  'what',
  'when',
  'into',
  'about',
  'file',
  'test',
]);

/** Distinctive words of a title: 4+ letters, no common filler. */
function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !TITLE_STOP.has(w));
}

function buildIntents(c: PortfolioContent): Intent[] {
  const companies = c.jobs.map((j) => j.company);
  const intents: Intent[] = [
    simple(
      'who',
      ['whoareyou', 'whois', 'yourself', 'waheed', 'intro', 'introduce', 'bio'],
      'me',
      "Here's a quick intro to Waheed.",
    ),
    {
      id: 'experience',
      keywords: [
        'experience',
        'worked',
        'employer',
        'employers',
        'career',
        'jobs',
        'companies',
        'history',
      ],
      weight: 1,
      plan: [
        open('experience'),
        say(`That's Waheed's work history${companies.length ? `: ${companies.join(', ')}` : ''}.`),
      ],
    },
    category(
      'ai',
      ['artificial', 'intelligence', 'llm', 'genai', 'gemini', 'machine'],
      "Here's Waheed's AI work.",
    ),
    category(
      'blockchain',
      ['crypto', 'web3', 'nft', 'ethereum', 'smart'],
      "Here are Waheed's blockchain projects.",
    ),
    category(
      'fintech',
      ['finance', 'financial', 'banking', 'payments', 'trading'],
      "Here are Waheed's fintech projects.",
    ),
    category(
      'web',
      ['website', 'websites', 'frontend', 'fullstack'],
      "Here are Waheed's web projects.",
    ),
    simple(
      'hire',
      ['hire', 'hiring', 'recruit', 'recruiter', 'freelance', 'available', 'availability'],
      'consult',
      "Here's how to start a conversation about working with Waheed.",
    ),
    simple(
      'contact',
      ['contact', 'email', 'reach', 'message', 'touch', 'talk'],
      'messages',
      "Here's where you can send Waheed a message.",
    ),
    simple('resume', ['resume', 'cv', 'curriculum', 'vitae'], 'resume', "Here's Waheed's resume."),
    simple(
      'blog',
      ['blog', 'posts', 'post', 'writing', 'articles', 'article', 'pensieve', 'wrote'],
      'pensieve',
      "Here's what Waheed has written.",
    ),
    simple(
      'skills',
      ['skills', 'skill', 'stack', 'technologies', 'languages'],
      'settings',
      "Here are the skills listed on Waheed's profile.",
    ),
    {
      id: 'tour',
      keywords: ['tour', 'walkthrough', 'drive', 'demo'],
      weight: 1,
      plan: [say('Sit back and watch me drive.'), { type: 'start_tour' }],
    },
    {
      id: 'projects',
      keywords: ['projects', 'project', 'portfolio', 'work'],
      weight: 1,
      plan: [
        open('projects'),
        { type: 'filter_projects' },
        say("Here are all of Waheed's projects."),
      ],
    },
    {
      id: 'featured',
      keywords: ['featured', 'highlights', 'favorite', 'favourite'],
      weight: 1,
      plan: [
        open('projects'),
        { type: 'filter_projects' },
        say('The featured projects sit at the top of the folder.'),
      ],
    },
    simple(
      'consult',
      ['consult', 'consulting', 'consultation', 'booking', 'advice', 'schedule'],
      'consult',
      "Here's how to book a consult with Waheed.",
    ),
    simple(
      'terminal',
      ['terminal', 'shell', 'console', 'cli'],
      'terminal',
      "Here's the terminal, a text way to explore the portfolio.",
    ),
    simple(
      'settings',
      ['settings', 'preferences', 'theme', 'appearance', 'wallpaper'],
      'settings',
      "Here's the settings app.",
    ),
    simple(
      'agentlog',
      ['agentlog', 'logs', 'activity'],
      'agentlog',
      'This is agent.log, a record of the steps I take.',
    ),
    simple(
      'hello',
      ['hello', 'hey', 'hi', 'hiya', 'howdy', 'greetings', 'yo'],
      null,
      "Hi! Ask me about Waheed's work, or press Let the agent drive.",
    ),
    simple(
      'help',
      ['help', 'capabilities', 'abilities'],
      null,
      "Ask about Waheed's experience, projects, writing or how to hire him, or press Let the agent drive.",
    ),
    simple(
      'thanks',
      ['thanks', 'thankyou', 'thx', 'cheers', 'appreciate'],
      null,
      "You're welcome!",
    ),
  ];

  for (const p of c.projects.filter((x) => x.featured)) {
    intents.push({
      id: `project-${p.id}`,
      keywords: PROJECT_KEYWORDS[p.id] ?? [norm(p.id)],
      weight: 3,
      plan: [open('projects'), { type: 'open_project', id: p.id }, say(`Here's ${shortTitle(p)}.`)],
    });
  }

  for (const j of c.jobs) {
    const key = norm(j.company);
    const spelled =
      c.projects.find((p) => p.company && norm(p.company) === key)?.company ?? j.company;
    intents.push({
      id: `company-${j.slug}`,
      keywords: COMPANY_KEYWORDS[key] ?? [key],
      weight: 3,
      plan: [
        open('experience'),
        open('projects'),
        { type: 'filter_projects', company: spelled },
        say(`Waheed was ${j.title} at ${j.company} (${j.range}). Here's what he built there.`),
      ],
    });
  }

  for (const post of c.posts) {
    const keywords = [...new Set(titleWords(post.title))];
    if (keywords.length < 2) continue;
    intents.push({
      id: `post-${post.slug}`,
      keywords,
      weight: 3,
      // A single title word is too common to open a post.
      minScore: 2,
      plan: [
        open('pensieve'),
        { type: 'open_post', slug: post.slug },
        say(`Here's the post "${post.title}".`),
      ],
    });
  }

  return intents;
}

export function intentIds(content: PortfolioContent): string[] {
  return buildIntents(content).map((i) => i.id);
}

export function intentPlan(id: string, content: PortfolioContent): AgentAction[] | null {
  return buildIntents(content).find((i) => i.id === id)?.plan ?? null;
}

/** Lowercase words plus adjacent pairs and triples joined, so "vaffa cosmo" can match "vaffacosmo". */
function tokenize(question: string): string[] {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const pairs = words.slice(1).map((w, i) => words[i] + w);
  const triples = words.slice(2).map((w, i) => words[i] + words[i + 1] + w);
  return [...words, ...pairs, ...triples];
}

/**
 * Exact, or one edit of slack when the keyword has 6+ letters and the token 5+.
 * Shorter words are exact only: "reach" is not "react", "there" is not "where".
 */
const hits = (keyword: string, token: string) =>
  keyword === token ||
  (keyword.length >= 6 && token.length >= 5 && damerauLevenshtein(keyword, token) <= 1);

/** Resolve a question to a scripted plan without any network call, or null. */
export function matchIntent(
  question: string,
  content: PortfolioContent,
): { id: string; actions: AgentAction[] } | null {
  const tokens = tokenize(question);
  if (!tokens.length) return null;
  let best: { intent: Intent; score: number } | null = null;
  for (const intent of buildIntents(content)) {
    const score = intent.keywords.filter((k) => tokens.some((t) => hits(k, t))).length;
    if (score < (intent.minScore ?? 1)) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && intent.weight > best.intent.weight)
    ) {
      best = { intent, score };
    }
  }
  return best ? { id: best.intent.id, actions: best.intent.plan } : null;
}
