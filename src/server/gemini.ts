import 'server-only';
import { generateObject, type ModelMessage } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { APP_IDS } from '@/os/apps/registry';
import type { FitReport } from '@/agent/actions';

const appId = z.enum(APP_IDS as [string, ...string[]]);

/** A previous turn of the visitor's conversation, oldest first. */
export interface Turn {
  role: 'user' | 'agent';
  text: string;
}

const provider = () => createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const model = () => provider()(process.env.GEMINI_MODEL as string);

const chatSchema = z.object({
  reply: z.string().describe('Your conversational answer to the visitor (markdown allowed).'),
  actions: z
    .array(
      z.object({
        type: z.enum([
          'open_app',
          'close_app',
          'filter_projects',
          'open_project',
          'open_post',
          'start_tour',
        ]),
        app: appId.optional().describe('for open_app / close_app'),
        tag: z
          .enum(['ai', 'blockchain', 'fintech', 'web'])
          .optional()
          .describe('for filter_projects'),
        company: z.string().optional().describe('for filter_projects'),
        id: z.string().optional().describe('project id for open_project'),
        slug: z.string().optional().describe('post slug for open_post'),
      }),
    )
    .describe('Desktop actions to show what the reply talks about, in order. Usually 1-2.'),
});

const ACTIONS_HELP = [
  '## Desktop actions',
  'Return them in "actions". Each is an object with "type" and its argument:',
  '- {type:"open_app", app} — open an app (app ids listed above). Skills and stack live in app "settings".',
  '- {type:"filter_projects", tag?, company?} — open projects filtered by tag (ai|blockchain|fintech|web) and/or company.',
  '- {type:"open_project", id} — open one project (open "projects" first).',
  '- {type:"open_post", slug} — open a blog post.',
  '- {type:"start_tour"} — the guided tour.',
  'Whenever your reply mentions showing or opening something, include the matching action.',
].join('\n');

/** A conversational answer plus the desktop actions the model chose. */
export async function askGemini(
  question: string,
  system: string,
  history: Turn[] = [],
): Promise<{ text: string; rawToolCalls: unknown[] }> {
  const messages: ModelMessage[] = [
    ...history.map((t): ModelMessage =>
      t.role === 'user'
        ? { role: 'user', content: t.text }
        : { role: 'assistant', content: t.text },
    ),
    { role: 'user', content: question },
  ];
  const { object } = await generateObject({
    model: model(),
    system: `${system}\n\n${ACTIONS_HELP}`,
    messages,
    schema: chatSchema,
    maxOutputTokens: 900,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(15_000),
  });
  const rawToolCalls = object.actions.map((a) =>
    Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined)),
  );
  return { text: object.reply.trim(), rawToolCalls };
}

const fitSchema = z.object({
  verdict: z.enum(['strong', 'good', 'partial']),
  summary: z.string(),
  matches: z.array(z.object({ requirement: z.string(), evidence: z.string() })),
  gaps: z.array(z.object({ requirement: z.string(), note: z.string() })),
  projectIds: z.array(z.string()),
});

/** A structured fit report for a pasted job description. */
export async function askFit(jobDescription: string, system: string): Promise<FitReport> {
  const { object } = await generateObject({
    model: model(),
    system,
    prompt: `Job description:\n"""\n${jobDescription}\n"""`,
    schema: fitSchema,
    maxOutputTokens: 1500,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(25_000),
  });
  return object;
}
