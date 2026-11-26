import type { Job, PortfolioContent, Project, ProjectTag } from '@/content/types';
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

const plain = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** "A, B and C" */
const list = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;

/** "Senior → Staff Software Engineer" style career path, or just the title. */
function roleLine(j: Job): string {
  return j.roles?.length
    ? [...j.roles]
        .reverse()
        .map((r) => r.title)
        .join(' → ')
    : j.title;
}

function buildIntents(c: PortfolioContent): Intent[] {
  const companies = c.jobs.map((j) => j.company);
  const current = c.jobs[0];
  const firstSentences = plain(c.about.html)
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(' ');
  const tagged = (tag: ProjectTag) =>
    c.projects
      .filter((p) => p.tags.includes(tag))
      .map((p) => `- **${shortTitle(p)}**${p.company ? ` (${p.company})` : ''}`);
  const tagReply = (tag: ProjectTag, intro: string) => {
    const items = tagged(tag);
    return items.length
      ? `${intro}\n${items.slice(0, 6).join('\n')}\nOpen any of them for the details.`
      : intro;
  };
  const topSkills = list(c.about.skills.slice(0, 10));
  const intents: Intent[] = [
    simple(
      'who',
      ['whoareyou', 'whoiswaheed', 'whois', 'yourself', 'intro', 'introduce', 'bio'],
      'me',
      `Meet Waheed. ${firstSentences}${current ? ` He's currently ${current.title} at ${current.company}.` : ''} His full intro is open on the desktop.`,
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
        say(
          `Waheed has worked at ${list(companies)}:\n${c.jobs.map((j) => `- **${roleLine(j)}**, ${j.company} (${j.range})`).join('\n')}\nClick a role in experience.app to see what he shipped there.`,
        ),
      ],
    },
    category(
      'ai',
      ['artificial', 'intelligence', 'llm', 'genai', 'gemini', 'machine'],
      tagReply('ai', "Here's Waheed's AI work — he builds LLM-powered tools, not just demos:"),
    ),
    category(
      'blockchain',
      ['crypto', 'web3', 'nft', 'ethereum', 'smart'],
      tagReply('blockchain', 'Waheed has shipped real web3 products:'),
    ),
    category(
      'fintech',
      ['finance', 'financial', 'banking', 'payments', 'trading'],
      tagReply('fintech', "Fintech is a big part of Waheed's track record:"),
    ),
    category(
      'web',
      ['website', 'websites', 'frontend', 'fullstack'],
      tagReply('web', 'Pretty much everything Waheed builds runs on the web. Highlights:'),
    ),
    simple(
      'hire',
      ['hire', 'hiring', 'recruit', 'recruiter', 'freelance', 'available', 'availability'],
      'consult',
      "Great call. Waheed is open to consulting and new roles — grab a free slot on the calendar I just opened. Tip: paste a job description here and I'll tell you how well he fits it.",
    ),
    simple(
      'contact',
      ['contact', 'email', 'reach', 'message', 'touch', 'talk'],
      'messages',
      "You can reach Waheed by email or on his socials — they're all in the messages window I just opened. If it's about a project, booking a call is the fastest route.",
    ),
    simple(
      'resume',
      ['resume', 'cv', 'curriculum', 'vitae'],
      'resume',
      "Here's Waheed's resume — read it right here or download the PDF.",
    ),
    simple(
      'blog',
      ['blog', 'posts', 'post', 'writing', 'articles', 'article', 'pensieve', 'wrote'],
      'pensieve',
      `Waheed writes about the things he runs into while building — ${c.posts.length} posts so far. Pick one in pensieve.`,
    ),
    simple(
      'skills',
      ['skills', 'skill', 'stack', 'technologies', 'languages'],
      'settings',
      `Waheed's core stack: ${topSkills}. The full list is open under Models and tools.`,
    ),
    {
      id: 'tour',
      keywords: ['tour', 'walkthrough', 'drive', 'demo'],
      weight: 1,
      plan: [
        say("Sit back — I'll drive you through the highlights in about a minute."),
        { type: 'start_tour' },
      ],
    },
    {
      id: 'projects',
      keywords: ['projects', 'project', 'portfolio', 'work'],
      weight: 1,
      plan: [
        open('projects'),
        { type: 'filter_projects' },
        say(
          `Here's everything Waheed has built — ${c.projects.length} projects, featured ones first. Filter by AI, blockchain, fintech or web.`,
        ),
      ],
    },
    {
      id: 'featured',
      keywords: ['featured', 'highlights'],
      weight: 1,
      plan: [
        open('projects'),
        { type: 'filter_projects' },
        say(
          `Waheed's featured builds: ${list(c.projects.filter((p) => p.featured).map(shortTitle))}. They're at the top of the folder.`,
        ),
      ],
    },
    simple(
      'consult',
      ['consult', 'consulting', 'consultation', 'booking', 'advice', 'schedule'],
      'consult',
      'Waheed offers a free consultation call — pick a slot on the calendar I just opened.',
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
      "Hey! 👋 I'm the agent running Waheed's portfolio. Ask me anything about his work, paste a job description to check his fit, or hit Let the agent drive for a tour.",
    ),
    simple(
      'help',
      ['help', 'capabilities', 'abilities'],
      null,
      "I can answer questions about Waheed's experience, skills and projects, open things on the desktop, check his fit against a job description you paste, or give you a guided tour.",
    ),
    simple(
      'thanks',
      ['thanks', 'thankyou', 'thx', 'cheers', 'appreciate'],
      null,
      "Anytime! Anything else you'd like to know about Waheed?",
    ),
  ];

  for (const p of c.projects.filter((x) => x.featured)) {
    intents.push({
      id: `project-${p.id}`,
      keywords: PROJECT_KEYWORDS[p.id] ?? [norm(p.id)],
      weight: 3,
      plan: [
        open('projects'),
        { type: 'open_project', id: p.id },
        say(
          `Here's **${shortTitle(p)}**${p.company ? `, built at ${p.company}` : ''}${p.tech.length ? ` with ${list(p.tech.slice(0, 4))}` : ''}.`,
        ),
      ],
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
        say(
          `At **${j.company}** Waheed ${j.roles?.length ? `grew from ${list([...j.roles].reverse().map((r) => r.title))}` : `was ${j.title}`} (${j.range}). Highlights:\n${j.bullets
            .slice(0, 3)
            .map((b) => `- ${b}`)
            .join('\n')}\nHis projects from there are open now.`,
        ),
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
        say(`Here's Waheed's post **${post.title}**.`),
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
